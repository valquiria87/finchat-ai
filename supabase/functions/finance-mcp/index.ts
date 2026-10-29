import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { pipeline } from "npm:@supabase/middleware@1";
import { withOAuthProtectedResource, withSupabase } from "npm:@supabase/server@1";
import { createMcpHandler, McpServer } from "npm:@modelcontextprotocol/server@^2.0.0";
import { z } from "npm:zod@^4.3.6";

const PAGE_SIZE = 1000;
const dateSchema = z.string().date().describe("Data no formato AAAA-MM-DD.");
const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .describe("Mês no formato AAAA-MM.");

type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

type PageQuery<T> = {
  range(from: number, to: number): PromiseLike<PageResult<T>>;
};

const jsonText = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
});

function errorText(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

function money(value: number) {
  return Number(value.toFixed(2));
}

function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = `${month}-01`;
  const end = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
  return { start, end };
}

// Fetch in pages to avoid calculating totals from only the first API page.
async function fetchAll<T>(query: PageQuery<T>) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return { data: rows, error: null };
  }
}

Deno.serve(
  pipeline(
    [withOAuthProtectedResource(), withSupabase({ auth: "user" })],
    async (request, { supabase }) => {
      const server = new McpServer({ name: "nexora-finance", version: "1.1.0" });

      server.registerTool(
        "listar_contas",
        {
          title: "Listar contas",
          description:
            "Lista as contas bancárias e cartões do usuário autenticado. Somente leitura.",
          inputSchema: {},
          annotations: { readOnlyHint: true },
        },
        async () => {
          const { data, error } = await supabase
            .from("accounts")
            .select("id, item_id, pluggy_account_id, name, type, balance, currency")
            .order("name");

          if (error) {
            console.error("listar_contas query failed", error.message);
            return errorText(
              "Não foi possível listar contas. Verifique o esquema e as políticas RLS.",
            );
          }
          return jsonText({ contas: data ?? [], quantidade: data?.length ?? 0 });
        },
      );

      server.registerTool(
        "saldo_total",
        {
          title: "Saldo total",
          description:
            "Calcula os saldos agregados por moeda para as contas visíveis ao usuário autenticado. Moedas diferentes não são somadas entre si. Somente leitura.",
          inputSchema: {},
          annotations: { readOnlyHint: true },
        },
        async () => {
          const { data, error } = await fetchAll(
            supabase.from("accounts").select("id, name, type, balance, currency").order("name"),
          );
          if (error) {
            console.error("saldo_total query failed", error.message);
            return errorText(
              "Não foi possível calcular os saldos. Verifique o esquema e as políticas RLS.",
            );
          }

          const totals = new Map<string, number>();
          for (const account of data ?? []) {
            const currency = account.currency || "BRL";
            totals.set(currency, (totals.get(currency) ?? 0) + Number(account.balance ?? 0));
          }

          return jsonText({
            quantidade_contas: data?.length ?? 0,
            saldos_por_moeda: Array.from(totals, ([moeda, total]) => ({
              moeda,
              saldo: money(total),
            })),
          });
        },
      );

      server.registerTool(
        "buscar_transacoes",
        {
          title: "Buscar transações",
          description:
            "Busca transações com filtros opcionais de data inicial/final, categoria, texto da descrição e limite. Datas inclusivas. Somente leitura.",
          inputSchema: {
            inicio: dateSchema.optional(),
            fim: dateSchema.optional(),
            categoria: z.string().trim().min(1).max(100).optional(),
            busca: z.string().trim().min(1).max(200).optional(),
            limite: z.number().int().min(1).max(500).default(50),
          },
          annotations: { readOnlyHint: true },
        },
        async ({ inicio, fim, categoria, busca, limite }) => {
          if (inicio && fim && inicio > fim) {
            return errorText("A data inicial deve ser anterior ou igual à data final.");
          }

          let query = supabase
            .from("transactions")
            .select("id, account_id, pluggy_tx_id, date, description, amount, type, category")
            .order("date", { ascending: false })
            .limit(limite);

          if (inicio) query = query.gte("date", inicio);
          if (fim) query = query.lte("date", fim);
          if (categoria) query = query.ilike("category", categoria);
          if (busca) query = query.ilike("description", `%${busca.replace(/[%_]/g, "")}%`);

          const { data, error } = await query;
          if (error) {
            console.error("buscar_transacoes query failed", error.message);
            return errorText(
              "Não foi possível buscar transações. Verifique o esquema e as políticas RLS.",
            );
          }
          return jsonText({ transacoes: data ?? [], quantidade: data?.length ?? 0, limite });
        },
      );

      server.registerTool(
        "gastos_por_categoria",
        {
          title: "Gastos por categoria",
          description:
            "Agrupa e soma os débitos por categoria no mês informado (AAAA-MM). Somente leitura.",
          inputSchema: { mes: monthSchema },
          annotations: { readOnlyHint: true },
        },
        async ({ mes }) => {
          const { start, end } = monthBounds(mes);
          const { data, error } = await fetchAll(
            supabase
              .from("transactions")
              .select("category, amount, type, date")
              .eq("type", "DEBITO")
              .gte("date", start)
              .lte("date", end),
          );

          if (error) {
            console.error("gastos_por_categoria query failed", error.message);
            return errorText(
              "Não foi possível agrupar os gastos. Verifique o esquema e as políticas RLS.",
            );
          }

          const totals = new Map<string, number>();
          for (const transaction of data ?? []) {
            const category = transaction.category?.trim() || "Sem categoria";
            totals.set(
              category,
              (totals.get(category) ?? 0) + Math.abs(Number(transaction.amount ?? 0)),
            );
          }
          const categorias = Array.from(totals, ([categoria, total]) => ({
            categoria,
            total: money(total),
          })).sort((a, b) => b.total - a.total);

          return jsonText({
            mes,
            total_gastos: money(categorias.reduce((sum, item) => sum + item.total, 0)),
            quantidade_transacoes: data?.length ?? 0,
            categorias,
            moeda: "BRL",
          });
        },
      );

      server.registerTool(
        "resumo_mensal",
        {
          title: "Resumo mensal",
          description:
            "Calcula créditos, débitos, saldo líquido e quantidade de transações no mês AAAA-MM. Somente leitura.",
          inputSchema: { mes: monthSchema },
          annotations: { readOnlyHint: true },
        },
        async ({ mes }) => {
          const { start, end } = monthBounds(mes);
          const { data, error } = await fetchAll(
            supabase
              .from("transactions")
              .select("amount, type, date")
              .gte("date", start)
              .lte("date", end),
          );

          if (error) {
            console.error("resumo_mensal query failed", error.message);
            return errorText(
              "Não foi possível gerar o resumo mensal. Verifique o esquema e as políticas RLS.",
            );
          }

          let creditos = 0;
          let debitos = 0;
          for (const transaction of data ?? []) {
            const amount = Math.abs(Number(transaction.amount ?? 0));
            if (transaction.type === "CREDITO") creditos += amount;
            if (transaction.type === "DEBITO") debitos += amount;
          }

          return jsonText({
            mes,
            quantidade_transacoes: data?.length ?? 0,
            total_creditos: money(creditos),
            total_debitos: money(debitos),
            resultado_liquido: money(creditos - debitos),
            moeda: "BRL",
          });
        },
      );

      server.registerTool(
        "maiores_gastos",
        {
          title: "Maiores gastos",
          description:
            "Lista os maiores débitos de um período, ordenados pelo valor absoluto da transação. Somente leitura.",
          inputSchema: {
            inicio: dateSchema,
            fim: dateSchema,
            top: z.number().int().min(1).max(100).default(10),
          },
          annotations: { readOnlyHint: true },
        },
        async ({ inicio, fim, top }) => {
          if (inicio > fim) {
            return errorText("A data inicial deve ser anterior ou igual à data final.");
          }

          const { data, error } = await fetchAll(
            supabase
              .from("transactions")
              .select("id, account_id, date, description, amount, type, category")
              .eq("type", "DEBITO")
              .gte("date", inicio)
              .lte("date", fim),
          );

          if (error) {
            console.error("maiores_gastos query failed", error.message);
            return errorText(
              "Não foi possível consultar os maiores gastos. Verifique o esquema e as políticas RLS.",
            );
          }

          const gastos = (data ?? [])
            .sort((a, b) => Math.abs(Number(b.amount ?? 0)) - Math.abs(Number(a.amount ?? 0)))
            .slice(0, top)
            .map((transaction) => ({
              ...transaction,
              amount: Math.abs(Number(transaction.amount ?? 0)),
            }));

          return jsonText({ inicio, fim, top, gastos });
        },
      );

      return createMcpHandler(() => server).fetch(request);
    },
  ),
);
