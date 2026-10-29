import { createFileRoute } from "@tanstack/react-router";
import { requireSupabaseUser, supabaseAuthErrorResponse } from "@/lib/auth.server";
import { getSupabaseServerClient } from "@/lib/supabase.server";

function isObservabilityAdmin(email: string | undefined): boolean {
  const allowlist = (process.env["OBSERVABILITY_ADMIN_EMAILS"] ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(email && allowlist.includes(email.toLowerCase()));
}

export const Route = createFileRoute("/api/observability/webhooks")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const user = await requireSupabaseUser(request);
          if (!isObservabilityAdmin(user.email)) {
            return Response.json(
              { error: "Acesso restrito à administração." },
              { status: 403 },
            );
          }

          const supabase = getSupabaseServerClient();
          const { data, error } = await supabase
            .from("webhook_events")
            .select(
              "event_id, event_type, status, attempts, error_code, created_at, updated_at, processed_at",
            )
            .order("created_at", { ascending: false })
            .limit(100);

          if (error) {
            console.error(
              JSON.stringify({
                level: "error",
                service: "nexora-observability",
                operation: "list_webhook_events",
                code: error.code ?? "DATABASE_ERROR",
              }),
            );
            return Response.json(
              { error: "Não foi possível consultar os eventos." },
              { status: 503 },
            );
          }

          const events = data ?? [];
          const counts = { processing: 0, completed: 0, failed: 0, ignored: 0 };
          for (const event of events) {
            if (event.status in counts) {
              counts[event.status as keyof typeof counts]++;
            }
          }

          return Response.json(
            {
              generatedAt: new Date().toISOString(),
              sampleSize: events.length,
              counts,
              events,
            },
            {
              headers: {
                "Cache-Control": "no-store",
                "Content-Type": "application/json; charset=utf-8",
              },
            },
          );
        } catch (error) {
          return (
            supabaseAuthErrorResponse(error) ??
            Response.json(
              { error: "Não foi possível autorizar a consulta." },
              { status: 500 },
            )
          );
        }
      },
    },
  },
});
