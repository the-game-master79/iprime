interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_HCAPTCHA_SITE_KEY: string;
  readonly VITE_TAWKTO_PROPERTY_ID: string;
  // Add any other env variables you need
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
