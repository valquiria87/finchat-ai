import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export const Route = createFileRoute("/observability")({
  component: ObservabilityPage,
});

type WebhookEvent = {
  event_id: string;
  event_type: string;
  status: "processing" | "completed" | "failed" | "ignored";
  attempts: number;
  error_code: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
};

type Snapshot = {
  generatedAt: string;
  sampleSize: number;
  counts: Record<WebhookEvent["status"], number>;
  events: WebhookEvent[];
};

function ObservabilityPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        throw new Error("A autenticação não está configurada.");
      }
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session) {
        throw new Error("Entre na sua conta administrativa para consultar a observabilidade.");
      }
      const response = await fetch("/api/observability/webhooks", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        cache: "no-store",
      });
      const result = (await response.json()) as Snapshot | { error?: string };
      if (!response.ok) {
        throw new Error("error" in result ? result.error : "Consulta indisponível.");
      }
      setSnapshot(result as Snapshot);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os eventos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const dateTime = (value: string | null) =>
    value ? new Date(value).toLocaleString("pt-BR") : "—";

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-primary">NEXORA FINANCE</p>
            <h1 className="mt-2 text-3xl font-semibold">Observabilidade de webhooks</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Visão operacional dos últimos eventos persistidos. O acesso é restrito a e-mails
              administrativos autorizados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Atualizar
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-destructive/40 p-4 text-sm"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">A consulta não foi concluída</p>
              <p className="mt-1 text-muted-foreground">{error}</p>
              {!error.includes("Acesso restrito") && !error.includes("autenticação") && (
                <button type="button" className="mt-3 underline" onClick={() => void load()}>
                  Tentar novamente
                </button>
              )}
            </div>
          </div>
        )}

        {loading && !snapshot && (
          <p className="text-sm text-muted-foreground">Carregando eventos…</p>
        )}

        {snapshot && (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(["processing", "completed", "failed", "ignored"] as const).map((status) => {
                const label =
                  status === "processing"
                    ? "Em processamento"
                    : status === "completed"
                      ? "Concluídos"
                      : status === "failed"
                        ? "Com falha"
                        : "Ignorados";
                return (
                  <article key={status} className="rounded-xl border border-border bg-card p-4">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="mt-2 text-3xl font-semibold tabular-nums">
                      {snapshot.counts[status]}
                    </p>
                  </article>
                );
              })}
            </section>

            <section className="rounded-xl border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
                <h2 className="font-semibold">Eventos recentes</h2>
                <p className="text-xs text-muted-foreground">
                  {snapshot.sampleSize} eventos · atualizado {dateTime(snapshot.generatedAt)}
                </p>
              </div>
              {snapshot.events.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Nenhum evento registrado ainda.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Evento</th>
                        <th className="px-4 py-3 font-medium">Estado</th>
                        <th className="px-4 py-3 font-medium">Tentativas</th>
                        <th className="px-4 py-3 font-medium">Código</th>
                        <th className="px-4 py-3 font-medium">Criado</th>
                        <th className="px-4 py-3 font-medium">Processado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.events.map((event) => (
                        <tr key={event.event_id} className="border-t border-border">
                          <td className="px-4 py-3">
                            <p className="font-medium">{event.event_type}</p>
                            <p className="mt-1 font-mono text-xs text-muted-foreground">
                              {event.event_id}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full border border-border px-2 py-1 text-xs">
                              {event.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 tabular-nums">{event.attempts}</td>
                          <td className="px-4 py-3 font-mono text-xs">{event.error_code ?? "—"}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {dateTime(event.created_at)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {dateTime(event.processed_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck size={15} />
              <span>
                A tela não exibe payload bruto, descrições bancárias, saldos, item_id ou
                mensagens de erro detalhadas.
              </span>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
