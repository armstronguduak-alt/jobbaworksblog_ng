import { createClient } from '@supabase/supabase-js';

// These are PUBLIC keys — safe to include in client-side code.
// The anon key only allows access based on Row Level Security (RLS) policies.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://klidnyqyjvbvzmplwdfl.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsaWRueXF5anZidnptcGx3ZGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTYxODMsImV4cCI6MjA5MDM3MjE4M30.Qt7IHXpY4li_8VxWXDmwhbqDflJWI7WDgC5J6hS_0bA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
