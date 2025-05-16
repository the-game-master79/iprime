import { createClient } from "@supabase/supabase-js";

// Supabase configuration using environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Create a single instance of the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);
