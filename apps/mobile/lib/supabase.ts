import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '@saktus/shared';

declare const process: { env: Record<string, string | undefined> };

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://tyvwwgigdgcnpjceiavq.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dnd3Z2lnZGdjbnBqY2VpYXZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTkwNDcsImV4cCI6MjA4ODgzNTA0N30.Audya4V6ysi38dxBEDDCkAswVO60g5Q4X1iJcXQu7QI';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
