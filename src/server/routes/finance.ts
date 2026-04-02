import { Hono } from "hono";
import { Env } from "../index";
import { authMiddleware, rbacMiddleware } from "../middleware/auth";

export const financeRoutes = new Hono<Env>();

financeRoutes.use("*", authMiddleware, rbacMiddleware);

// GET /api/financials/monthly-summary
financeRoutes.get("/monthly-summary", async (c) => {
  const month = c.req.query("month"); // YYYY-MM format

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return c.json({ error: "Invalid month format. Use YYYY-MM", code: 400 }, 400);
  }

  // Calculate sales from completed orders in the month
  const salesResult = await c.env.DB.prepare(`
    SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_sales
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    WHERE o.status = '완료'
      AND o.deleted_at IS NULL
      AND strftime('%Y-%m', o.order_date) = ?
  `)
    .bind(month)
    .first<{ total_sales: number }>();

  // Calculate purchases (stock IN) in the month
  const purchasesResult = await c.env.DB.prepare(`
    SELECT COALESCE(SUM(sh.quantity * i.unit_price), 0) as total_purchases
    FROM stock_history sh
    JOIN items i ON sh.item_id = i.item_id
    WHERE sh.transaction_type = 'IN'
      AND strftime('%Y-%m', sh.transaction_date) = ?
  `)
    .bind(month)
    .first<{ total_purchases: number }>();

  return c.json({
    month,
    salesAmount: salesResult?.total_sales || 0,
    purchaseAmount: purchasesResult?.total_purchases || 0,
    profit: (salesResult?.total_sales || 0) - (purchasesResult?.total_purchases || 0),
  });
});

// GET /api/financials/summary-range
financeRoutes.get("/summary-range", async (c) => {
  const from = c.req.query("from"); // YYYY-MM
  const to = c.req.query("to"); // YYYY-MM

  if (!from || !to) {
    return c.json({ error: "from and to parameters required (YYYY-MM)", code: 400 }, 400);
  }

  const salesResult = await c.env.DB.prepare(`
    SELECT strftime('%Y-%m', o.order_date) as month,
           COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_sales
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    WHERE o.status = '완료'
      AND o.deleted_at IS NULL
      AND strftime('%Y-%m', o.order_date) BETWEEN ? AND ?
    GROUP BY strftime('%Y-%m', o.order_date)
    ORDER BY month
  `)
    .bind(from, to)
    .all();

  return c.json({ months: salesResult.results });
});
