import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@saktus/shared';

const DEFAULT_SUPABASE_URL = 'https://tyvwwgigdgcnpjceiavq.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dnd3Z2lnZGdjbnBqY2VpYXZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTkwNDcsImV4cCI6MjA4ODgzNTA0N30.Audya4V6ysi38dxBEDDCkAswVO60g5Q4X1iJcXQu7QI';

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
