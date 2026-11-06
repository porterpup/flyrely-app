/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_FEATURE_DISRUPTION_COPILOT?: string;
  readonly VITE_FEATURE_COPILOT_PUSH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
