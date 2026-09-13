import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '@flowstate/shared';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://maftkhcqxhjhhmkkgmpi.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hZnRraGNxeGhqaGhta2tnbXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMzAwMDMsImV4cCI6MjEwNDgwNjAwM30.HU1g_pzl6oZ_UM4HbwdBdGKelWan3WAFxoHEmhTGLi0';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
