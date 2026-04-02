import { Hono } from "hono";
import { Env } from "../index";
import { authMiddleware, rbacMiddleware } from "../middleware/auth";

export const reportRoutes = new Hono<Env>();

reportRoutes.use("*", authMiddleware, rbacMiddleware);

// GET /api/reports/orders
reportRoutes.get("/orders", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");

  let sql = `
    SELECT o.status, COUNT(*) as count,
           COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_amount
    FROM orders o
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    WHERE o.deleted_at IS NULL
  `;
  const params: unknown[] = [];

  if (from) {
    sql += " AND o.order_date >= ?";
    params.push(from);
  }
  if (to) {
    sql += " AND o.order_date <= ?";
    params.push(to);
  }

  sql += " GROUP BY o.status";

  const result = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ report: result.results });
});

// GET /api/reports/inventory
reportRoutes.get("/inventory", async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT i.name, inv.current_quantity, inv.safety_stock, inv.warehouse_location,
           CASE
             WHEN inv.current_quantity = 0 THEN 'out'
             WHEN inv.current_quantity <= inv.safety_stock THEN 'low'
             ELSE 'normal'
           END as stock_status,
           (SELECT COUNT(*) FROM stock_history sh WHERE sh.item_id = i.item_id AND sh.transaction_type = 'IN') as total_in_count,
           (SELECT COUNT(*) FROM stock_history sh WHERE sh.item_id = i.item_id AND sh.transaction_type = 'OUT') as total_out_count
    FROM items i
    JOIN inventory inv ON i.item_id = inv.item_id
    WHERE i.deleted_at IS NULL
    ORDER BY i.name
  `).all();

  return c.json({ report: result.results });
});

// GET /api/reports/finance
reportRoutes.get("/finance", async (c) => {
  const from = c.req.query("from"); // YYYY-MM
  const to = c.req.query("to"); // YYYY-MM

  if (!from || !to) {
    return c.json({ error: "from and to required (YYYY-MM)", code: 400 }, 400);
  }

  const salesResult = await c.env.DB.prepare(`
    SELECT strftime('%Y-%m', o.order_date) as month,
           COUNT(DISTINCT o.order_id) as order_count,
           COALESCE(SUM(oi.quantity * oi.unit_price), 0) as sales_amount
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    WHERE o.status = '완료' AND o.deleted_at IS NULL
      AND strftime('%Y-%m', o.order_date) BETWEEN ? AND ?
    GROUP BY strftime('%Y-%m', o.order_date)
    ORDER BY month
  `)
    .bind(from, to)
    .all();

  const purchaseResult = await c.env.DB.prepare(`
    SELECT strftime('%Y-%m', sh.transaction_date) as month,
           COALESCE(SUM(sh.quantity * i.unit_price), 0) as purchase_amount
    FROM stock_history sh
    JOIN items i ON sh.item_id = i.item_id
    WHERE sh.transaction_type = 'IN'
      AND strftime('%Y-%m', sh.transaction_date) BETWEEN ? AND ?
    GROUP BY strftime('%Y-%m', sh.transaction_date)
    ORDER BY month
  `)
    .bind(from, to)
    .all();

  return c.json({
    sales: salesResult.results,
    purchases: purchaseResult.results,
  });
});
