import { createClient, type User } from "@supabase/supabase-js";

export class SupabaseAuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "SupabaseAuthError";
  }
}

export async function requireSupabaseUser(request: Request): Promise<User> {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) {
    throw new SupabaseAuthError("Entre na sua conta para continuar.", 401);
  }

  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] ?? process.env["VITE_SUPABASE_ANON_KEY"];

  if (!url || !anonKey) {
    throw new SupabaseAuthError(
      "Autenticação Supabase não configurada no servidor. Verifique a URL e a chave pública.",
      503,
    );
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(match[1]);
  if (error || !data.user) {
    throw new SupabaseAuthError("Sessão inválida ou expirada. Entre novamente.", 401);
  }

  return data.user;
}

export function supabaseAuthErrorResponse(error: unknown): Response | null {
  if (!(error instanceof SupabaseAuthError)) return null;
  return Response.json({ error: error.message }, { status: error.status });
}
