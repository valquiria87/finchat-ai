import { createFileRoute } from "@tanstack/react-router";
import {
  errorResponse,
  fetchFinanceData,
  linkedItemId,
  ownerCookie,
  sessionIdentity,
} from "@/lib/pluggy.server";
import { requireSupabaseUser, supabaseAuthErrorResponse } from "@/lib/auth.server";

export const Route = createFileRoute("/api/pluggy-data")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const user = await requireSupabaseUser(request);
          const owner = await sessionIdentity(request);
          if (owner !== user.id) {
            return new Response(JSON.stringify({ connected: false }), {
              headers: {
                "content-type": "application/json",
                "set-cookie": await ownerCookie(user.id),
              },
            });
          }

          const itemId = await linkedItemId(request);
          if (!itemId) return Response.json({ connected: false });

          const data = await fetchFinanceData(itemId);
          if (data.item.clientUserId !== user.id) {
            return Response.json(
              { error: "A conexão Pluggy não pertence à sua conta. Reconecte a instituição." },
              { status: 409 },
            );
          }
          return Response.json({ connected: true, ...data });
        } catch (error) {
          return supabaseAuthErrorResponse(error) ?? errorResponse(error);
        }
      },
    },
  },
});
