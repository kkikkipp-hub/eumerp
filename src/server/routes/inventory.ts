import { Hono } from "hono";
import { Env } from "../index";
import { authMiddleware, rbacMiddleware, auditLog } from "../middleware/auth";

export const inventoryRoutes = new Hono<Env>();

inventoryRoutes.use("*", authMiddleware, rbacMiddleware);

// GET /api/inventory
inventoryRoutes.get("/", async (c) => {
  const search = c.req.query("search");
  const stockStatus = c.req.query("stockStatus"); // normal, low, out

  let sql = `
    SELECT i.item_id, i.name, i.description, i.unit_price,
           inv.current_quantity, inv.safety_stock, inv.warehouse_location,
           CASE
             WHEN inv.current_quantity = 0 THEN 'out'
             WHEN inv.current_quantity <= inv.safety_stock THEN 'low'
             ELSE 'normal'
           END as stock_status
    FROM items i
    JOIN inventory inv ON i.item_id = inv.item_id
    WHERE i.deleted_at IS NULL
  `;
  const params: unknown[] = [];

  if (search) {
    sql += " AND (i.name LIKE ? OR CAST(i.item_id AS TEXT) LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  if (stockStatus === "low") {
    sql += " AND inv.current_quantity <= inv.safety_stock AND inv.current_quantity > 0";
  } else if (stockStatus === "out") {
    sql += " AND inv.current_quantity = 0";
  } else if (stockStatus === "normal") {
    sql += " AND inv.current_quantity > inv.safety_stock";
  }

  sql += " ORDER BY i.name ASC";

  const result = await c.env.DB.prepare(sql).bind(...params).all();

  // Count low stock items for badge
  const lowStockCount = await c.env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM inventory WHERE current_quantity <= safety_stock"
  ).first<{ cnt: number }>();

  return c.json({
    inventory: result.results,
    lowStockCount: lowStockCount?.cnt || 0,
  });
});

// GET /api/inventory/stock-history/:itemId
inventoryRoutes.get("/stock-history/:itemId", async (c) => {
  const itemId = parseInt(c.req.param("itemId"));
  const cursor = c.req.query("cursor");
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);

  let sql = `
    SELECT sh.*, u.username as responsible_person_name
    FROM stock_history sh
    LEFT JOIN users u ON sh.responsible_person_id = u.user_id
    WHERE sh.item_id = ?
  `;
  const params: unknown[] = [itemId];

  if (cursor) {
    sql += " AND sh.history_id < ?";
    params.push(parseInt(cursor));
  }

  sql += " ORDER BY sh.transaction_date DESC, sh.history_id DESC LIMIT ?";
  params.push(limit + 1);

  const result = await c.env.DB.prepare(sql).bind(...params).all();

  const hasMore = result.results.length > limit;
  const items = result.results.slice(0, limit);
  const nextCursor = hasMore && items.length > 0 ? String((items[items.length - 1] as any).history_id) : null;

  return c.json({ history: items, nextCursor, hasMore });
});

// POST /api/inventory/transaction - 입고/출고 처리
inventoryRoutes.post("/transaction", async (c) => {
  const user = (c as any).get("user") as any;
  const body = await c.req.json<{
    itemId: number;
    quantity: number;
    transactionType: "IN" | "OUT";
  }>();

  if (!body.itemId || !body.quantity || body.quantity <= 0 || !["IN", "OUT"].includes(body.transactionType)) {
    return c.json({ error: "Invalid transaction data", code: 400 }, 400);
  }

  const inventory = await c.env.DB.prepare("SELECT current_quantity FROM inventory WHERE item_id = ?")
    .bind(body.itemId)
    .first<{ current_quantity: number }>();

  if (!inventory) {
    return c.json({ error: "Item not found in inventory", code: 404 }, 404);
  }

  if (body.transactionType === "OUT" && inventory.current_quantity < body.quantity) {
    return c.json({
      error: `Insufficient stock. Current: ${inventory.current_quantity}, Requested: ${body.quantity}`,
      code: 409,
    }, 409);
  }

  const quantityChange = body.transactionType === "IN" ? body.quantity : -body.quantity;

  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE inventory SET current_quantity = current_quantity + ? WHERE item_id = ?").bind(quantityChange, body.itemId),
    c.env.DB.prepare(
      "INSERT INTO stock_history (item_id, quantity, transaction_type, responsible_person_id) VALUES (?, ?, ?, ?)"
    ).bind(body.itemId, body.quantity, body.transactionType, user.sub),
  ]);

  await auditLog(c.env.DB, user.sub, body.transactionType === "IN" ? "STOCK_IN" : "STOCK_OUT", "inventory", body.itemId, {
    quantity: body.quantity,
    newQuantity: inventory.current_quantity + quantityChange,
  });

  return c.json({
    itemId: body.itemId,
    transactionType: body.transactionType,
    quantity: body.quantity,
    newQuantity: inventory.current_quantity + quantityChange,
  });
});
