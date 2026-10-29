import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient, getSupabaseBrowserConfigError } from "@/lib/supabase-browser";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/consent")({
  component: OAuthConsent,
});

type AuthorizationDetails = {
  authorization_id?: string;
  redirect_url?: string;
  client: { name: string; uri?: string; logo_uri?: string };
  redirect_uri: string;
  scope?: string;
};

function OAuthConsent() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const client = getSupabaseBrowserClient();
    setSupabase(client);

    if (!client) {
      setError(getSupabaseBrowserConfigError() ?? "Supabase não está configurado.");
      setLoading(false);
      return () => {
        active = false;
      };
    }

    void client.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) {
          setError("Não foi possível verificar sua sessão.");
          setLoading(false);
          return;
        }

        if (!data.session) {
          const next = window.location.pathname + window.location.search;
          window.location.assign("/?next=" + encodeURIComponent(next));
          return;
        }

        const authorizationId = new URLSearchParams(window.location.search).get("authorization_id");
        if (!authorizationId) {
          setError("Solicitação OAuth sem o identificador de autorização.");
          setLoading(false);
          return;
        }

        void client.auth.oauth
          .getAuthorizationDetails(authorizationId)
          .then(({ data: authDetails, error: authError }) => {
            if (!active) return;
            if (authError || !authDetails) {
              setError(authError?.message ?? "Solicitação de autorização inválida ou expirada.");
              setLoading(false);
              return;
            }

            if (!("authorization_id" in authDetails) && "redirect_url" in authDetails) {
              window.location.assign(authDetails.redirect_url);
              return;
            }

            setDetails(authDetails as AuthorizationDetails);
            setLoading(false);
          })
          .catch(() => {
            if (!active) return;
            setError("Não foi possível carregar os detalhes da autorização.");
            setLoading(false);
          });
      })
      .catch(() => {
        if (!active) return;
        setError("Não foi possível verificar sua sessão.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const decide = async (decision: "approve" | "deny") => {
    const authorizationId = new URLSearchParams(window.location.search).get("authorization_id");
    if (!supabase || !authorizationId || busy) return;

    setBusy(true);
    setError("");
    try {
      const result =
        decision === "approve"
          ? await supabase.auth.oauth.approveAuthorization(authorizationId)
          : await supabase.auth.oauth.denyAuthorization(authorizationId);

      if (result.error || !result.data?.redirect_url) {
        throw new Error(result.error?.message ?? "Não foi possível concluir a autorização.");
      }

      window.location.assign(result.data.redirect_url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir a autorização.");
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <p className="text-sm text-muted-foreground">Verificando solicitação de acesso…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-primary">NEXORA FINANCE</p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">Autorizar acesso financeiro</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Revise quem está solicitando acesso antes de continuar. Você pode negar a solicitação.
        </p>
        {error && (
          <p className="mt-5 rounded-lg border border-destructive/30 p-3 text-sm" role="alert">
            {error}
          </p>
        )}
        {details && (
          <>
            <div className="mt-6 rounded-xl border border-border p-4">
              <h2 className="font-semibold text-foreground">{details.client.name}</h2>
              {details.client.uri && (
                <p className="mt-1 break-all text-sm text-muted-foreground">{details.client.uri}</p>
              )}
              <p className="mt-4 text-sm">
                <strong>Destino de retorno:</strong>{" "}
                <span className="break-all">{details.redirect_uri}</span>
              </p>
              <h3 className="mt-4 text-sm font-semibold">Permissões solicitadas</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {(details.scope?.trim() ? details.scope.split(" ") : ["email"]).map((scope) => (
                  <li key={scope}>{scope}</li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-muted-foreground">
                As consultas financeiras disponíveis neste MCP são somente leitura e continuam
                sujeitas às políticas de acesso do Nexora Finance.
              </p>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void decide("deny")}
              >
                Negar acesso
              </Button>
              <Button type="button" disabled={busy} onClick={() => void decide("approve")}>
                {busy ? "Processando…" : "Autorizar acesso"}
              </Button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
