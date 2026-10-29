import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { pipeline } from "npm:@supabase/middleware@1";
import {
  withOAuthProtectedResource,
  withSupabase,
} from "npm:@supabase/server@1";
import { createMcpHandler, McpServer } from "npm:@modelcontextprotocol/server@^2.0.0";
import { z } from "npm:zod@^4.3.6";

const jsonText = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
});

function errorText(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

Deno.serve(
  pipeline(
    [withOAuthProtectedResource(), withSupabase({ auth: "user" })],
    async (request, { supabase }) => {
      const server = new McpServer({ name: "nexora-finance", version: "1.0.0" });

      server.registerTool(
        "finance_summary",
        {
          title: "Resumo financeiro",
          description:
            "Returns the signed-in user's account balances and recent income/expense totals. Read-only; data access is restricted by Supabase RLS.",
          inputSchema: {
            days: z.number()
              .int()
              .min(1)
              .max(365)
              .default(30)
              .describe("Number of past days to summarize."),
          },
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
          inputSchema: {},
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
          inputSchema: {
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
          },
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
    },
  ),
);
