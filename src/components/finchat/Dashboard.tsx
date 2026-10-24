import { CreditCard, PieChart, Wallet } from "lucide-react";
import { demoProvider, formatUSD, spendingByCategory, totalAvailableCash, totalCardDebt } from "@/lib/finance";

/** Painel visual da demonstração. Todos os cálculos vêm de src/lib/finance.ts — nada é recalculado aqui. */
export function Dashboard() {
  const accounts = demoProvider.getAccounts();
  const txs = demoProvider.getTransactions();
  const cash = totalAvailableCash(accounts);
  const debt = totalCardDebt(accounts);
  const cats = spendingByCategory(txs);
  const maxCat = cats[0]?.total ?? 0;
  const totalSpent = cats.reduce((s, c) => s + c.total, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="rounded-3xl bg-hero p-8 text-primary-foreground shadow-soft">
        <h1 className="font-display text-3xl font-semibold">Painel financeiro</h1>
        <p className="mt-2 max-w-md opacity-85">Visão geral das contas de exemplo. Todos os valores são fictícios e servem apenas para demonstração.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Wallet className="h-4 w-4" /></span>
            Saldo bancário disponível
          </div>
          <p className="mt-3 font-display text-3xl font-semibold">{formatUSD(cash)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Soma apenas contas corrente e poupança. Limites e crédito dos cartões não entram.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground"><CreditCard className="h-4 w-4" /></span>
            Dívida total dos cartões
          </div>
          <p className="mt-3 font-display text-3xl font-semibold">{formatUSD(debt)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Quanto se deve aos emissores. Não é descontado do saldo disponível.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground"><PieChart className="h-4 w-4" /></span>
          Gastos por categoria
        </div>
        <p className="mt-3 font-display text-2xl font-semibold">{formatUSD(totalSpent)}</p>
        <div className="mt-4 space-y-3">
          {cats.map((c) => (
            <div key={c.category}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{c.category}</span>
                <span className="text-muted-foreground">{formatUSD(c.total)}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${maxCat ? (c.total / maxCat) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Calculado das transações de demonstração; entradas como salário não entram.</p>
      </div>
    </div>
  );
}
