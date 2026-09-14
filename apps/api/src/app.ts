import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { initSupabaseMiddleware } from "./lib/supabase";
import router from "./routes";
import type { AppContext } from "./types";

const app = new Hono<AppContext>();

// High-speed blocklist for reconnaissance and vulnerability probes (from Estavo standard)
const PROBE_PATTERNS = [
  /\.env($|\b|\/|\.)/i,
  /\.git($|\b|\/)/i,
  /\.aws($|\b|\/)/i,
  /\.ssh($|\b|\/)/i,
  /\.vscode($|\b|\/)/i,
  /\.idea($|\b|\/)/i,
  /\.DS_Store/i,
  /\.php($|\?|\/)/i,
  /(^|\/)wp-(admin|login|includes|content|config)/i,
  /xmlrpc\.php/i,
  /\.(sql|bak|backup|old|save|conf|ini)($|\?)/i,
  /\/(actuator|autodiscover|_profiler|phpinfo)/i,
];

app.use("*", async (c, next) => {
  const path = c.req.path;
  for (const pattern of PROBE_PATTERNS) {
    if (pattern.test(path)) {
      return c.text("Forbidden", 403, {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "X-Content-Type-Options": "nosniff",
      });
    }
  }
  return await next();
});

app.use("*", logger());
app.use("*", async (c, next) => {
  const allowedOrigins = (c.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const requestOrigin = c.req.header("Origin") || "";

  const isAllowed =
    allowedOrigins.length > 0
      ? allowedOrigins.includes(requestOrigin)
      : /^(https?:\/\/localhost(:\d+)?|https?:\/\/127\.0\.0\.1(:\d+)?|https:\/\/(.*\.)?saktus\.com|https:\/\/(.*\.)?pages\.dev|https:\/\/(.*\.)?workers\.dev)/.test(requestOrigin);

  return cors({
    origin: isAllowed ? requestOrigin : "",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Internal-Key", "X-API-Key"],
    credentials: true,
  })(c, next);
});

// Security Headers Middleware
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
});

// Initialize dynamic Supabase client from Cloudflare environment bindings
app.use("*", initSupabaseMiddleware);

// Root greeting
app.get("/", (c) => {
  return c.json({
    name: "Saktus API",
    status: "running",
    version: "1.0.0",
    docs: "/api/health",
  });
});

// Mount /api routes
app.route("/api", router);

// Global Error Catch for Soft Failure Responses
app.onError((err, c) => {
  console.error("API Server Error Caught:", err);
  return c.json({
    success: false,
    error: "Something went wrong. Please try again later.",
  }, 500);
});

export default app;
