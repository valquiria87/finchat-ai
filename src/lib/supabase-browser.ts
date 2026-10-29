import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function publicSupabaseKey(): string | undefined {
  return (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  );
}

export function getSupabaseBrowserConfigError(): string | null {
  if (!import.meta.env.VITE_SUPABASE_URL || !publicSupabaseKey()) {
    return "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ou VITE_SUPABASE_PUBLISHABLE_KEY) no ambiente do frontend.";
  }
  return null;
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (getSupabaseBrowserConfigError()) return null;
  if (!browserClient) {
    browserClient = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      publicSupabaseKey()!,
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
