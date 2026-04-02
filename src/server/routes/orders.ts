import { Hono } from "hono";
import { Env } from "../index";
import { authMiddleware, rbacMiddleware, auditLog } from "../middleware/auth";

export const orderRoutes = new Hono<Env>();

orderRoutes.use("*", authMiddleware, rbacMiddleware);

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  접수: ["확인", "취소"],
  확인: ["출고"],
  출고: ["배송"],
  배송: ["완료"],
};

// GET /api/orders - 주문 목록 (cursor-based pagination)
orderRoutes.get("/", async (c) => {
  const cursor = c.req.query("cursor");
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
  const status = c.req.query("status");
  const customerId = c.req.query("customerId");
  const urgent = c.req.query("urgent");
  const search = c.req.query("search");

  let sql = `
    SELECT o.*, c.name as customer_name,
           (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.order_id) as item_count
    FROM orders o
    JOIN customers c ON o.customer_id = c.customer_id
    WHERE o.deleted_at IS NULL
  `;
  const params: unknown[] = [];

  if (status) {
    sql += " AND o.status = ?";
    params.push(status);
  }
  if (customerId) {
    sql += " AND o.customer_id = ?";
    params.push(parseInt(customerId));
  }
  if (urgent === "true") {
    sql += " AND o.urgent_flag = 1";
  }
  if (search) {
    sql += " AND (CAST(o.order_id AS TEXT) LIKE ? OR c.name LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (cursor) {
    const [cursorDate, cursorId] = cursor.split("_");
    sql += " AND (o.order_date < ? OR (o.order_date = ? AND o.order_id < ?))";
    params.push(cursorDate, cursorDate, parseInt(cursorId));
  }

  sql += " ORDER BY o.order_date DESC, o.order_id DESC LIMIT ?";
  params.push(limit + 1);

  const stmt = c.env.DB.prepare(sql);
  const result = await stmt.bind(...params).all();

  const hasMore = result.results.length > limit;
  const items = result.results.slice(0, limit);
  const nextCursor =
    hasMore && items.length > 0 ? `${(items[items.length - 1] as any).order_date}_${(items[items.length - 1] as any).order_id}` : null;

  return c.json({ orders: items, nextCursor, hasMore });
});

// GET /api/orders/:orderId
orderRoutes.get("/:orderId", async (c) => {
  const orderId = parseInt(c.req.param("orderId"));

  const order = await c.env.DB.prepare(
    `SELECT o.*, c.name as customer_name
     FROM orders o JOIN customers c ON o.customer_id = c.customer_id
     WHERE o.order_id = ? AND o.deleted_at IS NULL`
  )
    .bind(orderId)
    .first();

  if (!order) return c.json({ error: "Order not found", code: 404 }, 404);

  const items = await c.env.DB.prepare(
    `SELECT oi.*, i.name as item_name
     FROM order_items oi JOIN items i ON oi.item_id = i.item_id
     WHERE oi.order_id = ?`
  )
    .bind(orderId)
    .all();

  return c.json({ ...order, items: items.results });
});

// GET /api/orders/:orderId/status
orderRoutes.get("/:orderId/status", async (c) => {
  const orderId = parseInt(c.req.param("orderId"));

  const order = await c.env.DB.prepare("SELECT order_id, status FROM orders WHERE order_id = ? AND deleted_at IS NULL")
    .bind(orderId)
    .first<{ order_id: number; status: string }>();

  if (!order) return c.json({ error: "Order not found", code: 404 }, 404);

  const logs = await c.env.DB.prepare(
    "SELECT previous_status, new_status, changed_at, changed_by FROM order_status_logs WHERE order_id = ? ORDER BY changed_at ASC"
  )
    .bind(orderId)
    .all();

  return c.json({ orderId: order.order_id, currentStatus: order.status, history: logs.results });
});

// POST /api/orders - 주문 접수 (D1 batch transaction)
orderRoutes.post("/", async (c) => {
  const user = (c as any).get("user") as any;
  const body = await c.req.json<{
    customerId: number;
    items: { itemId: number; quantity: number }[];
    notes?: string;
    urgentFlag?: boolean;
  }>();

  if (!body.customerId || !body.items?.length) {
    return c.json({ error: "customerId and items are required", code: 400 }, 400);
  }

  // Validate customer exists
  const customer = await c.env.DB.prepare("SELECT customer_id FROM customers WHERE customer_id = ? AND deleted_at IS NULL")
    .bind(body.customerId)
    .first();
  if (!customer) return c.json({ error: "Customer not found", code: 404 }, 404);

  // Insert order
  const orderResult = await c.env.DB.prepare(
    "INSERT INTO orders (customer_id, notes, urgent_flag) VALUES (?, ?, ?)"
  )
    .bind(body.customerId, body.notes || null, body.urgentFlag ? 1 : 0)
    .run();

  const orderId = orderResult.meta.last_row_id;

  // Insert order items + check inventory in batch
  const stmts: D1PreparedStatement[] = [];

  for (const item of body.items) {
    // Validate item exists
    const itemExists = await c.env.DB.prepare("SELECT item_id, unit_price FROM items WHERE item_id = ? AND deleted_at IS NULL")
      .bind(item.itemId)
      .first<{ item_id: number; unit_price: number }>();

    if (!itemExists) {
      // Rollback: delete the order
      await c.env.DB.prepare("DELETE FROM orders WHERE order_id = ?").bind(orderId).run();
      return c.json({ error: `Item ${item.itemId} not found`, code: 404 }, 404);
    }

    stmts.push(
      c.env.DB.prepare("INSERT INTO order_items (order_id, item_id, quantity, unit_price) VALUES (?, ?, ?, ?)")
        .bind(orderId, item.itemId, item.quantity, itemExists.unit_price)
    );
  }

  // Status log
  stmts.push(
    c.env.DB.prepare("INSERT INTO order_status_logs (order_id, previous_status, new_status, changed_by) VALUES (?, '', '접수', ?)")
      .bind(orderId, user.sub)
  );

  await c.env.DB.batch(stmts);

  await auditLog(c.env.DB, user.sub, "CREATE", "orders", orderId as number, { items: body.items });

  return c.json({ orderId, status: "접수" }, 201);
});

// PUT /api/orders/:orderId - 주문 수정
orderRoutes.put("/:orderId", async (c) => {
  const user = (c as any).get("user") as any;
  const orderId = parseInt(c.req.param("orderId"));
  const body = await c.req.json<{ notes?: string; urgentFlag?: boolean }>();

  const order = await c.env.DB.prepare("SELECT status FROM orders WHERE order_id = ? AND deleted_at IS NULL")
    .bind(orderId)
    .first<{ status: string }>();

  if (!order) return c.json({ error: "Order not found", code: 404 }, 404);

  if (!["접수", "확인"].includes(order.status)) {
    return c.json({ error: `Cannot modify order in '${order.status}' status`, code: 409 }, 409);
  }

  await c.env.DB.prepare("UPDATE orders SET notes = COALESCE(?, notes), urgent_flag = COALESCE(?, urgent_flag), modified_at = datetime('now') WHERE order_id = ?")
    .bind(body.notes ?? null, body.urgentFlag !== undefined ? (body.urgentFlag ? 1 : 0) : null, orderId)
    .run();

  await auditLog(c.env.DB, user.sub, "UPDATE", "orders", orderId, body);

  return c.json({ orderId, status: "수정 완료" });
});

// PUT /api/orders/:orderId/status - 상태 변경
orderRoutes.put("/:orderId/status", async (c) => {
  const user = (c as any).get("user") as any;
  const orderId = parseInt(c.req.param("orderId"));
  const { newStatus } = await c.req.json<{ newStatus: string }>();

  const order = await c.env.DB.prepare("SELECT status FROM orders WHERE order_id = ? AND deleted_at IS NULL")
    .bind(orderId)
    .first<{ status: string }>();

  if (!order) return c.json({ error: "Order not found", code: 404 }, 404);

  const allowed = VALID_TRANSITIONS[order.status];
  if (!allowed?.includes(newStatus)) {
    return c.json({ error: `Cannot transition from '${order.status}' to '${newStatus}'`, code: 409 }, 409);
  }

  const stmts: D1PreparedStatement[] = [
    c.env.DB.prepare("UPDATE orders SET status = ?, modified_at = datetime('now') WHERE order_id = ?").bind(newStatus, orderId),
    c.env.DB.prepare(
      "INSERT INTO order_status_logs (order_id, previous_status, new_status, changed_by) VALUES (?, ?, ?, ?)"
    ).bind(orderId, order.status, newStatus, user.sub),
  ];

  // If status is 출고, deduct inventory
  if (newStatus === "출고") {
    const items = await c.env.DB.prepare("SELECT item_id, quantity FROM order_items WHERE order_id = ?").bind(orderId).all();

    for (const item of items.results as any[]) {
      stmts.push(
        c.env.DB.prepare(
          "UPDATE inventory SET current_quantity = current_quantity - ? WHERE item_id = ? AND current_quantity >= ?"
        ).bind(item.quantity, item.item_id, item.quantity)
      );
      stmts.push(
        c.env.DB.prepare(
          "INSERT INTO stock_history (item_id, quantity, transaction_type, responsible_person_id) VALUES (?, ?, 'OUT', ?)"
        ).bind(item.item_id, item.quantity, user.sub)
      );
    }
  }

  if (newStatus === "취소") {
    stmts.push(c.env.DB.prepare("UPDATE orders SET canceled_at = datetime('now') WHERE order_id = ?").bind(orderId));
  }

  await c.env.DB.batch(stmts);

  await auditLog(c.env.DB, user.sub, "STATUS_CHANGE", "orders", orderId, {
    from: order.status,
    to: newStatus,
  });

  return c.json({ orderId, status: newStatus });
});

// DELETE /api/orders/:orderId - 주문 취소 (soft delete)
orderRoutes.delete("/:orderId", async (c) => {
  const user = (c as any).get("user") as any;
  const orderId = parseInt(c.req.param("orderId"));

  const order = await c.env.DB.prepare("SELECT status FROM orders WHERE order_id = ? AND deleted_at IS NULL")
    .bind(orderId)
    .first<{ status: string }>();

  if (!order) return c.json({ error: "Order not found", code: 404 }, 404);

  if (order.status !== "접수") {
    return c.json({ error: "Can only cancel orders in '접수' status", code: 409 }, 409);
  }

  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE orders SET status = '취소', canceled_at = datetime('now'), deleted_at = datetime('now') WHERE order_id = ?").bind(orderId),
    c.env.DB.prepare(
      "INSERT INTO order_status_logs (order_id, previous_status, new_status, changed_by) VALUES (?, '접수', '취소', ?)"
    ).bind(orderId, user.sub),
  ]);

  await auditLog(c.env.DB, user.sub, "DELETE", "orders", orderId);

  return c.json({ orderId, status: "취소" });
});

// POST /api/orders/upload - 대량 주문 엑셀 업로드
orderRoutes.post("/upload", async (c) => {
  const user = (c as any).get("user") as any;
  const body = await c.req.json<{
    orders: { customerId: number; itemId: number; quantity: number; notes?: string; urgentFlag?: boolean }[];
  }>();

  if (!body.orders?.length) {
    return c.json({ error: "No orders provided", code: 400 }, 400);
  }

  if (body.orders.length > 500) {
    return c.json({ error: "Maximum 500 rows allowed", code: 400 }, 400);
  }

  const errors: { row: number; error: string }[] = [];
  const stmts: D1PreparedStatement[] = [];
  let successCount = 0;

  // Validate all rows first
  for (let i = 0; i < body.orders.length; i++) {
    const row = body.orders[i];
    if (!row.customerId || !row.itemId || !row.quantity || row.quantity <= 0) {
      errors.push({ row: i + 1, error: "Invalid data: customerId, itemId, and positive quantity required" });
    }
  }

  if (errors.length > 0) {
    return c.json({ successCount: 0, errorCount: errors.length, errors }, 400);
  }

  // Process all orders in batch
  for (const row of body.orders) {
    stmts.push(
      c.env.DB.prepare("INSERT INTO orders (customer_id, notes, urgent_flag) VALUES (?, ?, ?)").bind(
        row.customerId,
        row.notes || null,
        row.urgentFlag ? 1 : 0
      )
    );
    successCount++;
  }

  try {
    await c.env.DB.batch(stmts);

    await auditLog(c.env.DB, user.sub, "BULK_UPLOAD", "orders", null, { count: successCount });

    return c.json({ successCount, errorCount: errors.length, errors });
  } catch (e: any) {
    return c.json({ error: "Batch upload failed: " + e.message, code: 500 }, 500);
  }
});
