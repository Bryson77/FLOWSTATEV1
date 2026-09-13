import { Hono } from "hono";
import type { AppContext } from "../types";

const healthRouter = new Hono<AppContext>();

healthRouter.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "saktus-api",
    runtime: "cloudflare-workers",
    environment: c.env.NODE_ENV || "production",
    timestamp: new Date().toISOString(),
  });
});

export default healthRouter;
