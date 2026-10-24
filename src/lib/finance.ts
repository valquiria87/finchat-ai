// Dados fictícios locais. Preparado para ser substituído por uma API futura.
export type AccountType = "checking" | "savings" | "credit";

export interface DemoAccount {
  id: string;
  name: string;
  type: AccountType;
  currency: "USD";
  /** Saldo da conta (contas correntes/poupança). */
  balance?: number;
  /** Dinheiro disponível (contas correntes/poupança). */
  available?: number;
  /** Dívida atual (cartões). */
  debt?: number;
  /** Crédito disponível (cartões); undefined = não informado. */
  availableCredit?: number;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { id: "chk", name: "Plaid Checking", type: "checking", currency: "USD", balance: 110, available: 100 },
  { id: "sav", name: "Plaid Saving", type: "savings", currency: "USD", balance: 210, available: 200 },
  { id: "cc", name: "Plaid Credit Card", type: "credit", currency: "USD", debt: 410 },
  { id: "bcc", name: "Plaid Business Credit Card", type: "credit", currency: "USD", debt: 5020, availableCredit: 4980 },
];

export function formatUSD(value: number): string {
  return "US$ " + value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Soma apenas dinheiro disponível em contas — nunca inclui dívidas nem limite de crédito. */
export function totalAvailableCash(accounts: DemoAccount[]): number {
  return accounts.filter((a) => a.type !== "credit").reduce((s, a) => s + (a.available ?? 0), 0);
}

export function totalCardDebt(accounts: DemoAccount[]): number {
  return accounts.filter((a) => a.type === "credit").reduce((s, a) => s + (a.debt ?? 0), 0);
}

export const SUGGESTIONS = [
  "Quais são minhas contas?",
  "Qual é meu saldo disponível?",
  "Quais foram minhas últimas transações?",
  "Quanto gastei por categoria?",
];

const DEMO_NOTE = "\n\n_Resposta baseada em dados simulados de demonstração._";

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function answer(question: string, accounts: DemoAccount[] = DEMO_ACCOUNTS): string {
  const q = norm(question);
  const cash = accounts.filter((a) => a.type !== "credit");
  const cards = accounts.filter((a) => a.type === "credit");

  if (/transac|movimenta|extrato|compra/.test(q)) {
    return (
      "Não há transações disponíveis nos dados de demonstração, então não consigo listar suas últimas movimentações. " +
      "Posso mostrar suas contas ou seu saldo disponível — experimente perguntar “Qual é meu saldo disponível?”." +
      DEMO_NOTE
    );
  }
  if (/categoria|gastei|gasto/.test(q)) {
    return (
      "Os dados de demonstração não incluem transações nem categorias de gastos, por isso não é possível calcular quanto você gastou por categoria. " +
      "Você pode perguntar “Quais são minhas contas?” para ver as contas de exemplo." +
      DEMO_NOTE
    );
  }
  if (/saldo|disponivel|dinheiro|quanto tenho/.test(q)) {
    const lines = cash.map((a) => `- **${a.name}**: disponível ${formatUSD(a.available ?? 0)} (saldo da conta ${formatUSD(a.balance ?? 0)})`);
    const cardLines = cards.map(
      (a) =>
        `- **${a.name}**: dívida ${formatUSD(a.debt ?? 0)}; crédito disponível ${a.availableCredit != null ? formatUSD(a.availableCredit) : "não informado"}`,
    );
    return (
      `Seu dinheiro disponível nas contas de exemplo é **${formatUSD(totalAvailableCash(accounts))}**:\n\n${lines.join("\n")}\n\n` +
      `Os cartões não entram nesse total — dívida não é dinheiro disponível, e limite de crédito também não:\n\n${cardLines.join("\n")}` +
      DEMO_NOTE
    );
  }
  if (/conta|cartao|cartoes/.test(q)) {
    const lines = accounts.map((a) =>
      a.type === "credit"
        ? `- **${a.name}** (cartão de crédito): dívida ${formatUSD(a.debt ?? 0)}; crédito disponível ${a.availableCredit != null ? formatUSD(a.availableCredit) : "não informado"}`
        : `- **${a.name}** (${a.type === "checking" ? "conta corrente" : "poupança"}): saldo ${formatUSD(a.balance ?? 0)}; disponível ${formatUSD(a.available ?? 0)}`,
    );
    return (
      `Estas são as contas de exemplo desta demonstração (não representam todas as suas contas):\n\n${lines.join("\n")}` + DEMO_NOTE
    );
  }
  return (
    "Não consigo responder a essa pergunta com os dados de demonstração disponíveis. " +
    "Tente algo como “Quais são minhas contas?” ou “Qual é meu saldo disponível?”." +
    DEMO_NOTE
  );
}
