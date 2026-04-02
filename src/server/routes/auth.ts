import { Hono } from "hono";
import { Env } from "../index";
import { signJWT, verifyPassword, hashPassword, auditLog } from "../middleware/auth";

export const authRoutes = new Hono<Env>();

// POST /api/auth/login
authRoutes.post("/login", async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>();

  if (!username || !password) {
    return c.json({ error: "Username and password required", code: 400 }, 400);
  }

  const user = await c.env.DB.prepare(
    "SELECT u.user_id, u.username, u.password_hash FROM users u WHERE u.username = ? AND u.deleted_at IS NULL"
  )
    .bind(username)
    .first<{ user_id: number; username: string; password_hash: string }>();

  if (!user) {
    return c.json({ error: "Invalid credentials", code: 401 }, 401);
  }

  const validPassword = await verifyPassword(password, user.password_hash);
  if (!validPassword) {
    return c.json({ error: "Invalid credentials", code: 401 }, 401);
  }

  // Get user roles
  const rolesResult = await c.env.DB.prepare(
    "SELECT r.role_name FROM user_roles ur JOIN roles r ON ur.role_id = r.role_id WHERE ur.user_id = ?"
  )
    .bind(user.user_id)
    .all<{ role_name: string }>();

  const roles = rolesResult.results.map((r) => r.role_name);

  // Generate access token (1 hour)
  const accessToken = await signJWT(
    { sub: user.user_id, username: user.username, roles, exp: Math.floor(Date.now() / 1000) + 3600 },
    c.env.JWT_SECRET
  );

  // Generate refresh token (7 days)
  const refreshToken = await signJWT(
    { sub: user.user_id, username: user.username, roles, exp: Math.floor(Date.now() / 1000) + 604800 },
    c.env.JWT_SECRET
  );

  await auditLog(c.env.DB, user.user_id, "LOGIN", "users", user.user_id);

  return c.json({
    accessToken,
    refreshToken,
    user: { userId: user.user_id, username: user.username, roles },
  });
});

// POST /api/auth/refresh
authRoutes.post("/refresh", async (c) => {
  const { refreshToken } = await c.req.json<{ refreshToken: string }>();

  if (!refreshToken) {
    return c.json({ error: "Refresh token required", code: 400 }, 400);
  }

  // Check blacklist
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(refreshToken));
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const blacklisted = await c.env.DB.prepare("SELECT id FROM token_blacklist WHERE token_hash = ?").bind(tokenHash).first();

  if (blacklisted) {
    return c.json({ error: "Token revoked", code: 401 }, 401);
  }

  // Verify refresh token
  const { verifyJWT } = await import("../middleware/auth");
  const payload = await verifyJWT(refreshToken, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ error: "Invalid refresh token", code: 401 }, 401);
  }

  // Get fresh roles
  const rolesResult = await c.env.DB.prepare(
    "SELECT r.role_name FROM user_roles ur JOIN roles r ON ur.role_id = r.role_id WHERE ur.user_id = ?"
  )
    .bind(payload.sub)
    .all<{ role_name: string }>();

  const roles = rolesResult.results.map((r) => r.role_name);

  const newAccessToken = await signJWT(
    { sub: payload.sub, username: payload.username, roles, exp: Math.floor(Date.now() / 1000) + 3600 },
    c.env.JWT_SECRET
  );

  return c.json({ accessToken: newAccessToken });
});

// POST /api/auth/logout
authRoutes.post("/logout", async (c) => {
  const { refreshToken } = await c.req.json<{ refreshToken: string }>();

  if (refreshToken) {
    const enc = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(refreshToken));
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await c.env.DB.prepare("INSERT OR IGNORE INTO token_blacklist (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
      .bind(tokenHash, 0, expiresAt)
      .run();
  }

  return c.json({ status: "logged out" });
});

// POST /api/auth/setup - Initial admin setup (only when no users exist)
authRoutes.post("/setup", async (c) => {
  const count = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM users").first<{ cnt: number }>();
  if (count && count.cnt > 0) {
    return c.json({ error: "Setup already completed", code: 400 }, 400);
  }

  const { username, password, email } = await c.req.json<{ username: string; password: string; email: string }>();
  const passwordHash = await hashPassword(password);

  const result = await c.env.DB.prepare("INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)")
    .bind(username, passwordHash, email)
    .run();

  const userId = result.meta.last_row_id;

  // Assign admin role
  const adminRole = await c.env.DB.prepare("SELECT role_id FROM roles WHERE role_name = '관리자'").first<{ role_id: number }>();
  if (adminRole) {
    await c.env.DB.prepare("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)").bind(userId, adminRole.role_id).run();
  }

  return c.json({ userId, status: "Admin user created" }, 201);
});
