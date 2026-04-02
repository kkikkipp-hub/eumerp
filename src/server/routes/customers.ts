import { Hono } from "hono";
import { Env } from "../index";
import { authMiddleware, rbacMiddleware } from "../middleware/auth";

export const customerRoutes = new Hono<Env>();

customerRoutes.use("*", authMiddleware, rbacMiddleware);

// GET /api/customers
customerRoutes.get("/", async (c) => {
  const result = await c.env.DB.prepare(
    "SELECT customer_id, name, contact_info FROM customers WHERE deleted_at IS NULL ORDER BY name"
  ).all();
  return c.json({ customers: result.results });
});

// GET /api/customers/receivables — 거래처별 미수금
customerRoutes.get("/receivables", async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT
      c.customer_id, c.name,
      COALESCE(SUM(CASE WHEN o.status = '완료' THEN oi.quantity * oi.unit_price ELSE 0 END), 0) as total_billed,
      COALESCE(SUM(CASE WHEN o.status IN ('접수','확인','출고','배송') THEN oi.quantity * oi.unit_price ELSE 0 END), 0) as outstanding,
      COUNT(DISTINCT CASE WHEN o.status IN ('접수','확인','출고','배송') THEN o.order_id END) as open_orders
    FROM customers c
    LEFT JOIN orders o ON c.customer_id = o.customer_id AND o.deleted_at IS NULL
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    WHERE c.deleted_at IS NULL
    GROUP BY c.customer_id
    ORDER BY outstanding DESC
  `).all();
  return c.json({ receivables: result.results });
});
