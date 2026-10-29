import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserConfigError(): string | null {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    return "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente do frontend.";
  }
  return null;
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (getSupabaseBrowserConfigError()) return null;
  if (!browserClient) {
    browserClient = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );
  }
  return browserClient;
}
