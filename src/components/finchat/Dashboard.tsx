import { CreditCard, PieChart, Wallet, Landmark, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import {
  demoProvider,
  formatUSD,
  spendingByCategory,
  totalAvailableCash,
  totalCardDebt,
  latestTransactions,
  isExpense,
  type FinanceDataProvider,
} from "@/lib/finance";

/** Painel visual da demonstração. Todos os cálculos vêm de src/lib/finance.ts — nada é recalculado aqui. */
export function Dashboard({
  compact = false,
  provider = demoProvider,
}: {
  compact?: boolean;
  provider?: FinanceDataProvider;
}) {
  const accounts = provider.getAccounts();
  const txs = provider.getTransactions();
  const cash = totalAvailableCash(accounts);
  const debt = totalCardDebt(accounts);
  const cats = spendingByCategory(txs);
  const maxCat = cats[0]?.total ?? 0;
  const totalSpent = cats.reduce((s, c) => s + c.total, 0);

  return (
    <section
      aria-label="Resumo financeiro"
      className={compact ? "space-y-6" : "mx-auto max-w-3xl space-y-6 px-4 py-8"}
    >
      {!compact && (
        <div className="border-b border-border pb-6">
          <h1 className="font-display text-3xl font-semibold">Painel financeiro</h1>
          <p className="mt-2 max-w-md opacity-85">
            Visão geral das contas de exemplo. Todos os valores são fictícios e servem apenas para
            demonstração.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Wallet className="h-4 w-4" />
            </span>
            Saldo bancário disponível
          </div>
          <p className="mt-3 font-display text-3xl font-semibold">{formatUSD(cash)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Soma apenas contas corrente e poupança. Limites e crédito dos cartões não entram.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <CreditCard className="h-4 w-4" />
            </span>
            Dívida total dos cartões
          </div>
          <p className="mt-3 font-display text-3xl font-semibold">{formatUSD(debt)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Quanto se deve aos emissores. Não é descontado do saldo disponível.
          </p>
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <PieChart className="h-4 w-4" />
          </span>
          Gastos por categoria
        </div>
        <p className="mt-3 font-display text-2xl font-semibold">{formatUSD(totalSpent)}</p>
        <div className="mt-4 space-y-3">
          {cats.length === 0 && (
            <p className="text-sm text-muted-foreground">Não há despesas disponíveis.</p>
          )}
          {cats.map((c) => (
            <div key={c.category}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{c.category}</span>
                <span className="text-muted-foreground">{formatUSD(c.total)}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${maxCat ? (c.total / maxCat) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Calculado das transações de demonstração; entradas como salário não entram.
        </p>
      </div>
      <div className="border-t border-border pt-5">
        <h2 className="flex items-center gap-2 font-display font-semibold">
          <Landmark className="h-4 w-4" /> Contas de exemplo{" "}
          <span className="text-sm font-normal text-muted-foreground">({accounts.length})</span>
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {accounts.map((a) => (
            <article key={a.id} className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">{a.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {a.type === "credit"
                  ? "Cartão de crédito"
                  : a.type === "checking"
                    ? "Conta corrente"
                    : "Poupança"}{" "}
                · USD
              </p>
              <p className="mt-3 text-sm">
                {a.type === "credit" ? "Dívida atual" : "Saldo disponível"}:{" "}
                <strong>
                  {(a.type === "credit" ? a.debt : a.available) != null
                    ? formatUSD((a.type === "credit" ? a.debt : a.available) ?? 0)
                    : "não informado"}
                </strong>
              </p>
              {a.type === "credit" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Crédito disponível:{" "}
                  {a.availableCredit != null ? formatUSD(a.availableCredit) : "não informado"}
                </p>
              )}
            </article>
          ))}
        </div>
        {accounts.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">Não há contas disponíveis.</p>
        )}
      </div>
      <div className="border-t border-border pt-5">
        <h2 className="font-display font-semibold">Últimas movimentações</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Recorte fictício de outubro de 2026; não é um extrato completo para reconciliar saldos.
        </p>
        <ul className="mt-3 divide-y divide-border">
          {latestTransactions(txs).map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                {isExpense(t) ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownLeft className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium">{t.description}</p>
                <p className="text-xs text-muted-foreground">
                  {t.date.split("-").reverse().join("/")} · {t.category} ·{" "}
                  {isExpense(t) ? "Despesa" : "Entrada"}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {isExpense(t) ? "−" : "+"}
                {formatUSD(Math.abs(t.amount))}
              </span>
            </li>
          ))}
        </ul>
        {txs.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">Não há movimentações disponíveis.</p>
        )}
      </div>
    </section>
  );
}
