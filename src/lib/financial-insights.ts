import {
  formatBRL,
  isExpense,
  latestTransactions,
  spendingByCategory,
  type DemoAccount,
  type DemoTransaction,
  type FinanceDataProvider,
} from "@/lib/finance";

function formatMoney(value: number, currency: string | null): string {
  if (!currency || currency === "BRL") return formatBRL(value);

  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  }
}

function formatDate(date: string): string {
  const [year, month, day] = date.slice(0, 10).split("-");
  return day && month && year ? `${day}/${month}/${year}` : date;
}

/**
 * Produces auditable financial observations from the transactions currently available.
 * Amounts are grouped by currency; values in different currencies are never added together.
 */
export function buildFinancialInsights(
  accounts: DemoAccount[],
  transactions: DemoTransaction[],
  mode: FinanceDataProvider["mode"] = "demo",
): string {
  if (transactions.length === 0) {
    return [
      "**Análise financeira — Nexora Finance**",
      "",
      "Ainda não há transações disponíveis para identificar padrões de gastos.",
      "Conecte uma instituição ou carregue registros de demonstração para gerar uma análise.",
      "",
      mode === "demo"
        ? "_A análise será baseada nos dados simulados quando estiverem disponíveis._"
        : "_Nenhuma conclusão foi gerada porque não há transações carregadas._",
    ].join("\n");
  }

  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const expenses = transactions.filter(isExpense);
  const incomes = transactions.filter((transaction) => transaction.amount < 0);
  const totalsByCurrency = new Map<string, number>();

  for (const transaction of expenses) {
    const currency =
      transaction.currency ??
      accounts.find((account) => account.id === transaction.accountId)?.currency ??
      (mode === "demo" ? "BRL" : "UNKNOWN");
    totalsByCurrency.set(currency, (totalsByCurrency.get(currency) ?? 0) + transaction.amount);
  }

  const categories = spendingByCategory(expenses);
  const lines = [
    "**Análise financeira — Nexora Finance**",
    "",
    `**Base analisada:** ${transactions.length} movimentações, sendo ${expenses.length} despesas e ${incomes.length} entradas.`,
  ];

  if (totalsByCurrency.size === 0) {
    lines.push("", "Não foram identificadas despesas positivas nos registros disponíveis.");
  } else {
    lines.push("", "**Despesas por moeda:**");
    for (const [currency, total] of [...totalsByCurrency.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      lines.push(
        `- ${currency === "UNKNOWN" ? "Moeda não informada" : currency}: ${formatMoney(total, currency === "UNKNOWN" ? null : currency)}`,
      );
    }
  }

  const topCategory = categories[0];
  if (topCategory) {
    const currency = topCategory.currency ?? (mode === "demo" ? "BRL" : "UNKNOWN");
    const currencyTotal = totalsByCurrency.get(currency) ?? topCategory.total;
    const share = currencyTotal > 0 ? (topCategory.total / currencyTotal) * 100 : 0;
    lines.push(
      "",
      "**Maior concentração de gastos:**",
      `- ${topCategory.category || "Sem categoria"}: ${formatMoney(topCategory.total, currency === "UNKNOWN" ? null : currency)} (${share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% das despesas registradas em ${currency}).`,
    );
  }

  const largestExpense = [...expenses].sort((a, b) => b.amount - a.amount)[0];
  if (largestExpense) {
    const currency =
      largestExpense.currency ??
      accounts.find((account) => account.id === largestExpense.accountId)?.currency ??
      (mode === "demo" ? "BRL" : "UNKNOWN");
    lines.push(
      "",
      "**Maior despesa individual registrada:**",
      `- ${largestExpense.description || "Descrição não informada"} — ${formatMoney(largestExpense.amount, currency === "UNKNOWN" ? null : currency)} em ${formatDate(largestExpense.date)}.`,
    );
  }

  if (topCategory && totalsByCurrency.size > 0) {
    lines.push(
      "",
      "**Ponto para revisar:**",
      `- ${topCategory.category || "Sem categoria"} é a categoria com maior gasto registrado. Vale conferir se há despesas recorrentes ou cobranças que podem ser revistas; os dados, sozinhos, não indicam que o gasto seja excessivo.`,
    );
  }

  lines.push(
    "",
    mode === "demo"
      ? "_Análise explicável baseada em dados simulados. Os resultados não representam um extrato bancário real._"
      : "_Análise quantitativa dos registros carregados da conexão Pluggy. A cobertura depende do período sincronizado; os valores não foram convertidos entre moedas._",
    "_Esta análise descreve os registros disponíveis; não é previsão nem aconselhamento financeiro._",
  );

  return lines.join("\n");
}
