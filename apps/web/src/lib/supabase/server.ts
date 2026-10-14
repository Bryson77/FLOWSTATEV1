import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const DEFAULT_SUPABASE_URL = 'https://tyvwwgigdgcnpjceiavq.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dnd3Z2lnZGdjbnBqY2VpYXZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTkwNDcsImV4cCI6MjA4ODgzNTA0N30.Audya4V6ysi38dxBEDDCkAswVO60g5Q4X1iJcXQu7QI';

export async function createClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}
