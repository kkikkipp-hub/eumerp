import { Hono } from "hono";
import { Env } from "../index";
import { authMiddleware, rbacMiddleware, hashPassword, verifyPassword, auditLog } from "../middleware/auth";

export const userRoutes = new Hono<Env>();

userRoutes.use("*", authMiddleware, rbacMiddleware);

// GET /api/users
userRoutes.get("/", async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT u.user_id, u.username, u.email, u.created_at,
           GROUP_CONCAT(r.role_name) as roles
    FROM users u
    LEFT JOIN user_roles ur ON u.user_id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.role_id
    WHERE u.deleted_at IS NULL
    GROUP BY u.user_id
    ORDER BY u.created_at DESC
  `).all();

  return c.json({
    users: result.results.map((u: any) => ({
      ...u,
      roles: u.roles ? u.roles.split(",") : [],
    })),
  });
});

// POST /api/users
userRoutes.post("/", async (c) => {
  const user = (c as any).get("user") as any;
  const body = await c.req.json<{ username: string; password: string; email: string; roleId?: number }>();

  if (!body.username || !body.password || !body.email) {
    return c.json({ error: "username, password, and email required", code: 400 }, 400);
  }

  const existing = await c.env.DB.prepare("SELECT user_id FROM users WHERE (username = ? OR email = ?) AND deleted_at IS NULL")
    .bind(body.username, body.email)
    .first();

  if (existing) {
    return c.json({ error: "Username or email already exists", code: 409 }, 409);
  }

  const passwordHash = await hashPassword(body.password);

  const result = await c.env.DB.prepare("INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)")
    .bind(body.username, passwordHash, body.email)
    .run();

  const userId = result.meta.last_row_id;

  if (body.roleId) {
    await c.env.DB.prepare("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)").bind(userId, body.roleId).run();
  }

  await auditLog(c.env.DB, user.sub, "CREATE", "users", userId as number, { username: body.username });

  return c.json({ userId, status: "Created" }, 201);
});

// PUT /api/user-roles
userRoutes.put("/user-roles", async (c) => {
  const currentUser = (c as any).get("user") as any;
  const body = await c.req.json<{ userId: number; roleId: number }>();

  if (!body.userId || !body.roleId) {
    return c.json({ error: "userId and roleId required", code: 400 }, 400);
  }

  // Verify user exists
  const targetUser = await c.env.DB.prepare("SELECT user_id FROM users WHERE user_id = ? AND deleted_at IS NULL")
    .bind(body.userId)
    .first();
  if (!targetUser) return c.json({ error: "User not found", code: 404 }, 404);

  // Verify role exists
  const role = await c.env.DB.prepare("SELECT role_id FROM roles WHERE role_id = ?").bind(body.roleId).first();
  if (!role) return c.json({ error: "Role not found", code: 404 }, 404);

  // Remove existing roles and assign new one
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM user_roles WHERE user_id = ?").bind(body.userId),
    c.env.DB.prepare("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)").bind(body.userId, body.roleId),
  ]);

  // Invalidate all refresh tokens for this user
  await c.env.DB.prepare(
    "INSERT INTO token_blacklist (token_hash, user_id, expires_at) SELECT 'role_change_' || ?, ?, datetime('now', '+7 days')"
  )
    .bind(body.userId, body.userId)
    .run();

  await auditLog(c.env.DB, currentUser.sub, "ROLE_CHANGE", "user_roles", body.userId, { newRoleId: body.roleId });

  return c.json({ userId: body.userId, status: "Role updated" });
});

// GET /api/users/roles
userRoutes.get("/roles", async (c) => {
  const result = await c.env.DB.prepare("SELECT * FROM roles").all();
  return c.json({ roles: result.results });
});

// PUT /api/users/password — 비밀번호 변경
userRoutes.put("/password", async (c) => {
  const user = (c as any).get("user") as any;
  const body = await c.req.json<{ currentPassword: string; newPassword: string }>();

  if (!body.currentPassword || !body.newPassword) {
    return c.json({ error: "현재 비밀번호와 새 비밀번호를 입력하세요", code: 400 }, 400);
  }
  if (body.newPassword.length < 6) {
    return c.json({ error: "새 비밀번호는 6자 이상이어야 합니다", code: 400 }, 400);
  }

  const dbUser = await c.env.DB.prepare("SELECT password_hash FROM users WHERE user_id = ?")
    .bind(user.sub).first<{ password_hash: string }>();
  if (!dbUser) return c.json({ error: "사용자를 찾을 수 없습니다", code: 404 }, 404);

  const valid = await verifyPassword(body.currentPassword, dbUser.password_hash);
  if (!valid) return c.json({ error: "현재 비밀번호가 일치하지 않습니다", code: 401 }, 401);

  const newHash = await hashPassword(body.newPassword);
  await c.env.DB.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE user_id = ?")
    .bind(newHash, user.sub).run();

  await auditLog(c.env.DB, user.sub, "PASSWORD_CHANGE", "users", user.sub);
  return c.json({ status: "비밀번호가 변경되었습니다" });
});

// GET /api/users/audit-log — 감사 로그 조회
userRoutes.get("/audit-log", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200);
  const cursor = c.req.query("cursor");
  const tableName = c.req.query("table");

  let sql = `SELECT al.*, u.username FROM audit_log al LEFT JOIN users u ON al.user_id = u.user_id WHERE 1=1`;
  const params: unknown[] = [];

  if (tableName) { sql += " AND al.table_name = ?"; params.push(tableName); }
  if (cursor) { sql += " AND al.log_id < ?"; params.push(parseInt(cursor)); }

  sql += " ORDER BY al.created_at DESC, al.log_id DESC LIMIT ?";
  params.push(limit + 1);

  const result = await c.env.DB.prepare(sql).bind(...params).all();
  const hasMore = result.results.length > limit;
  const items = result.results.slice(0, limit);
  const nextCursor = hasMore && items.length > 0 ? String((items[items.length - 1] as any).log_id) : null;

  return c.json({ logs: items, nextCursor, hasMore });
});
