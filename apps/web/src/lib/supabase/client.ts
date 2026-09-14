import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@saktus/shared';

const DEFAULT_SUPABASE_URL = 'https://maftkhcqxhjhhmkkgmpi.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hZnRraGNxeGhqaGhta2tnbXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMzAwMDMsImV4cCI6MjEwNDgwNjAwM30.HU1g_pzl6oZ_UM4HbwdBdGKelWan3WAFxoHEmhTGLi0';

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

  if (typeof window === 'undefined') {
    return createBrowserClient<Database>(url, key);
  }

  if (!client) {
    client = createBrowserClient<Database>(url, key);
  }

  return client;
}
