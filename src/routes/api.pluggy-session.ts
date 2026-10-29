import { createFileRoute } from "@tanstack/react-router";
import {
  clearSessionCookie,
  errorResponse,
  linkedItemId,
  ownerCookie,
  pluggyFetch,
  sessionCookie,
  sessionIdentity,
  fetchFinanceData,
} from "@/lib/pluggy.server";
import { syncPluggyFinanceData } from "@/lib/supabase.server";
import { requireSupabaseUser, supabaseAuthErrorResponse } from "@/lib/auth.server";

export const Route = createFileRoute("/api/pluggy-session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const user = await requireSupabaseUser(request);
          const owner = await sessionIdentity(request);
          const connected = owner === user.id && Boolean(await linkedItemId(request));
          return new Response(JSON.stringify({ connected }), {
            headers: {
              "content-type": "application/json",
              "set-cookie": await ownerCookie(user.id),
            },
          });
        } catch (error) {
          return supabaseAuthErrorResponse(error) ?? errorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const user = await requireSupabaseUser(request);
          const body = (await request.json()) as { itemId?: unknown };
          if (typeof body.itemId !== "string" || !/^[\w-]{1,100}$/.test(body.itemId)) {
            return Response.json({ error: "Item inválido." }, { status: 400 });
          }

          const itemResponse = await pluggyFetch("/items/" + encodeURIComponent(body.itemId));
          const item = (await itemResponse.json()) as { id?: string; clientUserId?: string };
          if (item.clientUserId !== user.id || item.id !== body.itemId) {
            return Response.json({ error: "Este item não pertence à sua conta." }, { status: 403 });
          }

          // Persist the verified bank connection and its initial account/transaction snapshot.
          const financeData = await fetchFinanceData(body.itemId);
          await syncPluggyFinanceData(user.id, financeData);

          const headers = new Headers({ "content-type": "application/json" });
          headers.append("set-cookie", await ownerCookie(user.id));
          headers.append("set-cookie", await sessionCookie(body.itemId, user.id));
          return new Response(JSON.stringify({ connected: true }), { headers });
        } catch (error) {
          return supabaseAuthErrorResponse(error) ?? errorResponse(error);
        }
      },
      DELETE: async ({ request }) => {
        try {
          const user = await requireSupabaseUser(request);
          const owner = await sessionIdentity(request);
          if (owner !== user.id) {
            const headers = new Headers({ "content-type": "application/json" });
            headers.append("set-cookie", clearSessionCookie);
            headers.append("set-cookie", await ownerCookie(user.id));
            return new Response(JSON.stringify({ connected: false }), { headers });
          }

          const itemId = await linkedItemId(request);
          if (itemId) {
            await pluggyFetch("/items/" + encodeURIComponent(itemId), { method: "DELETE" });
          }

          const headers = new Headers({ "content-type": "application/json" });
          headers.append("set-cookie", clearSessionCookie);
          headers.append("set-cookie", await ownerCookie(user.id));
          return new Response(JSON.stringify({ connected: false }), { headers });
        } catch (error) {
          return supabaseAuthErrorResponse(error) ?? errorResponse(error);
        }
      },
    },
  },
});
