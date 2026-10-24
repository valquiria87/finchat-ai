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

/** Origem dos dados do chat. Hoje só existe a demonstração; uma fonte real futura implementa a mesma interface. */
export interface FinanceDataProvider {
  mode: "demo";
  getAccounts(): DemoAccount[];
}

export const demoProvider: FinanceDataProvider = { mode: "demo", getAccounts: () => DEMO_ACCOUNTS };

export function formatUSD(value: number): string {
  return "US$ " + value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const isBank = (a: DemoAccount) => a.type === "checking" || a.type === "savings";

/** Soma apenas o saldo disponível de contas bancárias (corrente/poupança). Nunca inclui cartões, empréstimos ou limites. */
export function totalAvailableCash(accounts: DemoAccount[]): number {
  return accounts.filter((a) => isBank(a) && a.available != null).reduce((s, a) => s + (a.available as number), 0);
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

export type Intent = "card_purchase" | "cash" | "card_debt" | "card_limit" | "transactions" | "categories" | "accounts" | "unknown";

const CARD = /cartao|cartoes|credito/;

/** Identifica a intenção. A ordem importa: perguntas mais específicas vêm antes. */
export function detectIntent(question: string): Intent {
  const q = norm(question);
  if (CARD.test(q) && /\b(usar|uso|pagar|comprar|compra|compras)\b/.test(q)) return "card_purchase";
  if (/credito disponivel/.test(q)) return "card_limit";
  if (/dinheiro|saldo|quanto tenho/.test(q)) return "cash";
  if (/divida|devo|devendo|fatura/.test(q)) return "card_debt";
  if (/limite/.test(q)) return "card_limit";
  if (/transac|movimenta|extrato|compra/.test(q)) return "transactions";
  if (/categoria|gastei|gasto/.test(q)) return "categories";
  if (/conta|cartao|cartoes|credito/.test(q)) return "accounts";
  return "unknown";
}

const fmtOpt = (v: number | undefined) => (v != null ? formatUSD(v) : "não informado");

export function answer(question: string, accounts: DemoAccount[] = DEMO_ACCOUNTS): string {
  const bank = accounts.filter(isBank);
  const cards = accounts.filter((a) => a.type === "credit");
  const cash = formatUSD(totalAvailableCash(accounts));

  switch (detectIntent(question)) {
    case "card_purchase": {
      const lines = cards.map(
        (a) => `- **${a.name}**: dívida atual ${fmtOpt(a.debt)}; limite total não informado; crédito disponível ${fmtOpt(a.availableCredit)}`,
      );
      return (
        "Sim, um cartão de crédito permite fazer compras usando o **crédito disponível** — mas isso é um empréstimo do emissor, não dinheiro seu na conta. Cada compra aumenta a dívida do cartão.\n\n" +
        "Vale diferenciar:\n\n" +
        "- **Dívida atual**: quanto você já deve ao cartão.\n" +
        "- **Limite total**: o valor máximo de crédito concedido.\n" +
        "- **Crédito disponível**: quanto ainda pode ser usado em compras.\n\n" +
        `Nos dados de demonstração:\n\n${lines.join("\n")}\n\n` +
        "Para o Plaid Credit Card, o crédito disponível não foi informado, então não é possível confirmar se há crédito para uma compra. " +
        `Seu dinheiro próprio disponível nas contas de exemplo é ${cash}, separado do crédito dos cartões.` +
        DEMO_NOTE
      );
    }
    case "cash": {
      const lines = bank.map((a) => `- **${a.name}**: disponível ${fmtOpt(a.available)} (saldo da conta ${fmtOpt(a.balance)})`);
      return (
        `Seu dinheiro disponível nas contas bancárias de exemplo é **${cash}**:\n\n${lines.join("\n")}\n\n` +
        "Esse total soma apenas o saldo disponível das contas corrente e poupança. Não entram dívidas de cartão, limites ou crédito disponível dos cartões, nem empréstimos — crédito não é dinheiro seu." +
        DEMO_NOTE
      );
    }
    case "card_debt": {
      const lines = cards.map((a) => `- **${a.name}**: dívida atual ${fmtOpt(a.debt)}`);
      return (
        `A dívida atual dos cartões de exemplo soma **${formatUSD(totalCardDebt(accounts))}**:\n\n${lines.join("\n")}\n\n` +
        "Esse valor é o que se deve aos emissores e não é descontado nem somado ao seu dinheiro disponível." +
        DEMO_NOTE
      );
    }
    case "card_limit": {
      const lines = cards.map((a) => `- **${a.name}**: limite total não informado; crédito disponível ${fmtOpt(a.availableCredit)}`);
      return (
        "O **limite total** é o máximo de crédito concedido; o **crédito disponível** é quanto ainda pode ser usado.\n\n" +
        `Nos dados de demonstração:\n\n${lines.join("\n")}\n\n` +
        "O limite total não está nos dados, e o crédito disponível do Plaid Credit Card não foi informado, então não é possível calculá-los." +
        DEMO_NOTE
      );
    }
    case "transactions":
      return (
        "Não há transações disponíveis nos dados de demonstração, então não consigo listar suas últimas movimentações. " +
        "Posso mostrar suas contas ou seu saldo disponível — experimente perguntar “Qual é meu saldo disponível?”." +
        DEMO_NOTE
      );
    case "categories":
      return (
        "Os dados de demonstração não incluem transações nem categorias de gastos, por isso não é possível calcular quanto você gastou por categoria. " +
        "Você pode perguntar “Quais são minhas contas?” para ver as contas de exemplo." +
        DEMO_NOTE
      );
    case "accounts": {
      const lines = accounts.map((a) =>
        a.type === "credit"
          ? `- **${a.name}** (cartão de crédito): dívida ${fmtOpt(a.debt)}; crédito disponível ${fmtOpt(a.availableCredit)}`
          : `- **${a.name}** (${a.type === "checking" ? "conta corrente" : "poupança"}): saldo ${fmtOpt(a.balance)}; disponível ${fmtOpt(a.available)}`,
      );
      return `Estas são as contas de exemplo desta demonstração (não representam todas as suas contas):\n\n${lines.join("\n")}` + DEMO_NOTE;
    }
    default:
      return (
        "Não consigo responder a essa pergunta com os dados de demonstração disponíveis. " +
        "Tente algo como “Quais são minhas contas?” ou “Qual é meu saldo disponível?”." +
        DEMO_NOTE
      );
  }
}
