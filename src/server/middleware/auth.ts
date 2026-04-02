import { Context, Next } from "hono";
import type { Env } from "../index";

interface JWTPayload {
  sub: number;
  username: string;
  roles: string[];
  exp: number;
  iat: number;
}

// Base64url encode/decode
function base64urlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): ArrayBuffer {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

async function getSigningKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signJWT(payload: Omit<JWTPayload, "iat">, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now };

  const enc = new TextEncoder();
  const headerB64 = base64urlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(enc.encode(JSON.stringify(fullPayload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(signingInput));

  return `${signingInput}.${base64urlEncode(signature)}`;
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const signingInput = `${headerB64}.${payloadB64}`;
    const enc = new TextEncoder();

    const key = await getSigningKey(secret);
    const signature = base64urlDecode(signatureB64);
    const valid = await crypto.subtle.verify("HMAC", key, signature, enc.encode(signingInput));
    if (!valid) return null;

    const payload: JWTPayload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64)));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// PBKDF2 password hashing
export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: "SHA-256" },
    key,
    256
  );
  const saltB64 = base64urlEncode(salt);
  const hashB64 = base64urlEncode(derived);
  return `${saltB64}:${hashB64}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split(":");
  const salt = base64urlDecode(saltB64);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key,
    256
  );
  const newHashB64 = base64urlEncode(derived);
  return newHashB64 === hashB64;
}

// Auth middleware
export async function authMiddleware(c: Context<Env>, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized", code: 401 }, 401);
  }

  const token = authHeader.slice(7);
  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ error: "Invalid or expired token", code: 401 }, 401);
  }

  (c as any).set("user", payload);
  await next();
}

// RBAC route-permission matrix
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "POST /api/orders": ["관리자", "영업팀"],
  "PUT /api/orders": ["관리자", "영업팀"],
  "DELETE /api/orders": ["관리자", "영업팀"],
  "GET /api/orders": ["관리자", "영업팀", "물류팀", "회계팀", "뷰어"],
  "POST /api/inventory": ["관리자", "물류팀"],
  "GET /api/inventory": ["관리자", "영업팀", "물류팀", "회계팀", "뷰어"],
  "GET /api/financials": ["관리자", "회계팀", "뷰어"],
  "GET /api/users": ["관리자"],
  "POST /api/users": ["관리자"],
  "PUT /api/users": ["관리자", "영업팀", "물류팀", "회계팀", "뷰어"],
  "PUT /api/user-roles": ["관리자"],
  "GET /api/reports": ["관리자", "영업팀", "물류팀", "회계팀", "뷰어"],
  "GET /api/customers": ["관리자", "영업팀", "물류팀", "회계팀", "뷰어"],
  "GET /api/items": ["관리자", "영업팀", "물류팀", "회계팀", "뷰어"],
  "POST /api/items": ["관리자", "물류팀"],
  "PUT /api/items": ["관리자", "물류팀"],
  "DELETE /api/items": ["관리자"],
};

export async function rbacMiddleware(c: Context<Env>, next: Next) {
  const user = (c as any).get("user") as JWTPayload;
  if (!user) return c.json({ error: "Unauthorized", code: 401 }, 401);

  const method = c.req.method;
  const path = c.req.path;

  // Find matching route pattern
  const routeKey = Object.keys(ROUTE_PERMISSIONS).find((key) => {
    const [m, p] = key.split(" ");
    return m === method && path.startsWith(p);
  });

  if (!routeKey) {
    return c.json({ error: "Forbidden", code: 403 }, 403);
  }

  const allowedRoles = ROUTE_PERMISSIONS[routeKey];
  const hasPermission = user.roles.some((role: string) => allowedRoles.includes(role));

  if (!hasPermission) {
    return c.json({ error: "Forbidden: insufficient permissions", code: 403 }, 403);
  }

  await next();
}

// Audit log helper
export async function auditLog(
  db: D1Database,
  userId: number | null,
  action: string,
  tableName: string,
  recordId: number | null,
  changes?: Record<string, unknown>
) {
  await db
    .prepare("INSERT INTO audit_log (user_id, action, table_name, record_id, changes) VALUES (?, ?, ?, ?, ?)")
    .bind(userId, action, tableName, recordId, changes ? JSON.stringify(changes) : null)
    .run();
}
