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

  await next();
};
