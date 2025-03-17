interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // Add any other env variables you need
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
