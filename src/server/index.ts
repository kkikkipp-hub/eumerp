import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRoutes } from "./routes/auth";
import { orderRoutes } from "./routes/orders";
import { inventoryRoutes } from "./routes/inventory";
import { financeRoutes } from "./routes/finance";
import { userRoutes } from "./routes/users";
import { reportRoutes } from "./routes/reports";

export type Env = {
  Bindings: {
    DB: D1Database;
    JWT_SECRET: string;
  };
};

const app = new Hono<Env>();

app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: ["https://eumerp.pages.dev", "http://localhost:5173"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// API routes
app.route("/api/auth", authRoutes);
app.route("/api/orders", orderRoutes);
app.route("/api/inventory", inventoryRoutes);
app.route("/api/financials", financeRoutes);
app.route("/api/users", userRoutes);
app.route("/api/reports", reportRoutes);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

export default app;
