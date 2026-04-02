import { Hono } from "hono";
import { Env } from "../index";
import { authMiddleware, rbacMiddleware, auditLog } from "../middleware/auth";

export const itemRoutes = new Hono<Env>();

itemRoutes.use("*", authMiddleware, rbacMiddleware);

// GET /api/items
itemRoutes.get("/", async (c) => {
  const search = c.req.query("search");
  let sql = "SELECT * FROM items WHERE deleted_at IS NULL";
  const params: unknown[] = [];

  if (search) {
    sql += " AND (name LIKE ? OR description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += " ORDER BY name ASC";

  const result = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ items: result.results });
});

// POST /api/items — 품목 등록 + 재고 초기화
itemRoutes.post("/", async (c) => {
  const user = (c as any).get("user") as any;
  const body = await c.req.json<{
    name: string;
    description?: string;
    unitPrice: number;
    initialQuantity?: number;
    safetyStock?: number;
    warehouseLocation?: string;
  }>();

  if (!body.name || body.unitPrice == null) {
    return c.json({ error: "품목명과 단가는 필수입니다", code: 400 }, 400);
  }

  const existing = await c.env.DB.prepare("SELECT item_id FROM items WHERE name = ? AND deleted_at IS NULL")
    .bind(body.name).first();
  if (existing) {
    return c.json({ error: "이미 존재하는 품목명입니다", code: 409 }, 409);
  }

  const result = await c.env.DB.prepare(
    "INSERT INTO items (name, description, unit_price) VALUES (?, ?, ?)"
  ).bind(body.name, body.description || null, body.unitPrice).run();

  const itemId = result.meta.last_row_id;

  // 재고 레코드 자동 생성
  await c.env.DB.prepare(
    "INSERT INTO inventory (item_id, current_quantity, safety_stock, warehouse_location) VALUES (?, ?, ?, ?)"
  ).bind(itemId, body.initialQuantity || 0, body.safetyStock || 10, body.warehouseLocation || null).run();

  // 초기 수량이 있으면 입고 이력 기록
  if (body.initialQuantity && body.initialQuantity > 0) {
    await c.env.DB.prepare(
      "INSERT INTO stock_history (item_id, quantity, transaction_type, responsible_person_id) VALUES (?, ?, 'IN', ?)"
    ).bind(itemId, body.initialQuantity, user.sub).run();
  }

  await auditLog(c.env.DB, user.sub, "CREATE", "items", itemId as number, { name: body.name });

  return c.json({ itemId, status: "품목이 등록되었습니다" }, 201);
});

// PUT /api/items/:itemId — 품목 수정
itemRoutes.put("/:itemId", async (c) => {
  const user = (c as any).get("user") as any;
  const itemId = parseInt(c.req.param("itemId"));
  const body = await c.req.json<{ name?: string; description?: string; unitPrice?: number; safetyStock?: number; warehouseLocation?: string }>();

  const item = await c.env.DB.prepare("SELECT item_id FROM items WHERE item_id = ? AND deleted_at IS NULL")
    .bind(itemId).first();
  if (!item) return c.json({ error: "품목을 찾을 수 없습니다", code: 404 }, 404);

  const stmts: D1PreparedStatement[] = [];

  if (body.name || body.description !== undefined || body.unitPrice !== undefined) {
    stmts.push(c.env.DB.prepare(
      "UPDATE items SET name = COALESCE(?, name), description = COALESCE(?, description), unit_price = COALESCE(?, unit_price) WHERE item_id = ?"
    ).bind(body.name || null, body.description ?? null, body.unitPrice ?? null, itemId));
  }

  if (body.safetyStock !== undefined || body.warehouseLocation !== undefined) {
    stmts.push(c.env.DB.prepare(
      "UPDATE inventory SET safety_stock = COALESCE(?, safety_stock), warehouse_location = COALESCE(?, warehouse_location) WHERE item_id = ?"
    ).bind(body.safetyStock ?? null, body.warehouseLocation ?? null, itemId));
  }

  if (stmts.length > 0) await c.env.DB.batch(stmts);

  await auditLog(c.env.DB, user.sub, "UPDATE", "items", itemId, body);
  return c.json({ itemId, status: "수정되었습니다" });
});

// DELETE /api/items/:itemId — 품목 삭제 (soft delete)
itemRoutes.delete("/:itemId", async (c) => {
  const user = (c as any).get("user") as any;
  const itemId = parseInt(c.req.param("itemId"));

  await c.env.DB.prepare("UPDATE items SET deleted_at = datetime('now') WHERE item_id = ? AND deleted_at IS NULL")
    .bind(itemId).run();

  await auditLog(c.env.DB, user.sub, "DELETE", "items", itemId);
  return c.json({ itemId, status: "삭제되었습니다" });
});
