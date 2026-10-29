import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2";
import { createMcpHandler, McpServer } from "npm:@modelcontextprotocol/server@^2.0.0";
import { z } from "npm:zod@^4.3.6";

const jsonText = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
});

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\\s+(.+)$/i);
  return match?.[1] ?? null;
}

function errorText(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, content-type, mcp-session-id, mcp-protocol-version",
        "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      },
    });
  }

  const token = getBearerToken(request);
  if (!token) {
    return Response.json({ error: "Authorization Bearer token is required." }, { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !anonKey) {
    console.error("Missing Supabase URL or publishable/anon key.");
    return Response.json({ error: "MCP server is not configured." }, { status: 503 });
  }

  // The caller's JWT is forwarded so every query is evaluated under RLS.
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return Response.json({ error: "Invalid or expired Supabase access token." }, { status: 401 });
  }

  const server = new McpServer({ name: "nexora-finance", version: "1.0.0" });

  server.registerTool(
    "finance_summary",
    {
      title: "Resumo financeiro",
      description:
        "Returns the signed-in user's account balances and recent income/expense totals. Read-only; data access is restricted by Supabase RLS.",
      inputSchema: z.object({
        days: z.number()
          .int()
          .min(1)
          .max(365)
          .default(30)
          .describe("Number of past days to summarize."),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ days }) => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const [accountsResult, transactionsResult] = await Promise.all([
        supabase
          .from("accounts")
          .select("id, name, type, currency, balance, credit_limit")
          .order("name"),
        supabase
          .from("transactions")
          .select("amount, currency, date, category")
          .gte("date", since)
          .order("date", { ascending: false })
          .limit(5000),
      ]);

      if (accountsResult.error || transactionsResult.error) {
        console.error(
          "finance_summary query failed",
          accountsResult.error?.message,
          transactionsResult.error?.message,
        );
        return errorText(
          "Não foi possível consultar o resumo financeiro. Verifique as políticas RLS e o esquema do banco.",
        );
      }

      const transactions = transactionsResult.data ?? [];
      const income = transactions
        .filter((item) => Number(item.amount) > 0)
        .reduce((sum, item) => sum + Number(item.amount), 0);
      const expenses = transactions
        .filter((item) => Number(item.amount) < 0)
        .reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0);

      return jsonText({
        period_days: days,
        accounts: accountsResult.data ?? [],
        transaction_count: transactions.length,
        income_total: Number(income.toFixed(2)),
        expense_total: Number(expenses.toFixed(2)),
        net_total: Number((income - expenses).toFixed(2)),
        note:
          "Totais calculados apenas sobre as transações retornadas pelo banco e visíveis ao usuário autenticado.",
      });
    },
  );

  server.registerTool(
    "list_finance_accounts",
    {
      title: "Listar contas bancárias",
      description:
        "Lists bank accounts belonging to the signed-in user. Read-only.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, name, type, currency, balance, credit_limit")
        .order("name")
        .limit(100);

      if (error) {
        console.error("list_finance_accounts query failed", error.message);
        return errorText(
          "Não foi possível listar as contas. Verifique as políticas RLS e o esquema do banco.",
        );
      }
      return jsonText(data ?? []);
    },
  );

  server.registerTool(
    "list_finance_transactions",
    {
      title: "Consultar movimentações",
      description:
        "Lists the signed-in user's transactions, optionally filtered by date range and category. Read-only.",
      inputSchema: z.object({
        start_date: z.string()
          .date()
          .optional()
          .describe("Optional inclusive start date, YYYY-MM-DD."),
        end_date: z.string()
          .date()
          .optional()
          .describe("Optional inclusive end date, YYYY-MM-DD."),
        category: z.string().trim().min(1).max(100).optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ start_date, end_date, category, limit }) => {
      if (start_date && end_date && start_date > end_date) {
        return errorText("A data inicial deve ser anterior ou igual à data final.");
      }

      let query = supabase
        .from("transactions")
        .select("id, account_id, date, description, amount, currency, category")
        .order("date", { ascending: false })
        .limit(limit);

      if (start_date) query = query.gte("date", `${start_date}T00:00:00.000Z`);
      if (end_date) query = query.lte("date", `${end_date}T23:59:59.999Z`);
      if (category) query = query.ilike("category", category);

      const { data, error } = await query;
      if (error) {
        console.error("list_finance_transactions query failed", error.message);
        return errorText(
          "Não foi possível consultar as movimentações. Verifique as políticas RLS e o esquema do banco.",
        );
      }
      return jsonText(data ?? []);
    },
  );

  const handler = createMcpHandler(() => server);
  return handler.fetch(request);
});
