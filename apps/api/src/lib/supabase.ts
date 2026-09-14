import { createClient } from "@supabase/supabase-js";
import type { MiddlewareHandler } from "hono";
import type { AppContext } from "../types";
import type { Database } from "@saktus/shared";

export const initSupabaseMiddleware: MiddlewareHandler<AppContext> = async (c, next) => {
  const supabaseUrl = c.env.SUPABASE_URL;
  const supabaseKey = c.env.SUPABASE_SERVICE_ROLE_KEY || c.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase credentials not found in Cloudflare Worker environment bindings.");
  } else {
    // Check for Authorization header from client requests
    const authHeader = c.req.header("Authorization");
    
    const client = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });

    c.set("supabase", client);
  }

  return await next();
};

export const requireAuthMiddleware: MiddlewareHandler<AppContext> = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized: Please sign in to access this resource." }, 401);
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const supabase = c.get("supabase");
  if (!supabase) {
    return c.json({ error: "Service temporarily unavailable. Please try again later." }, 503);
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return c.json({ error: "Unauthorized: Session expired or invalid. Please sign in again." }, 401);
  }

  c.set("userId", user.id);
  return await next();
};
