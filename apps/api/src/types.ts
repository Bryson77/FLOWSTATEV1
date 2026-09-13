import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@saktus/shared";

export interface EnvBindings {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  RESEND_API_KEY?: string;
  NODE_ENV?: string;
}

export interface AppVariables {
  supabase: SupabaseClient<Database>;
  userId?: string;
}

export interface AppContext {
  Bindings: EnvBindings;
  Variables: AppVariables;
}
