import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please ensure you have VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY defined in your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true
  },
  // Add timeout and retry limits
  global: {
    headers: {
      'x-application-name': 'cloudforex',
    },
    // Timeout after 30 seconds
    requestTimeout: 30000,
    // Maximum number of retries
    maxRetries: 3
  }
});
