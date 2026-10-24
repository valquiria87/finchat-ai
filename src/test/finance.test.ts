import { describe, it, expect } from "vitest";
import { DEMO_TRANSACTIONS, latestTransactions, spendingByCategory, answer, detectIntent, formatUSD, totalAvailableCash, DEMO_ACCOUNTS } from "@/lib/finance";

describe("regras financeiras", () => {
  it("formata em US$ com vírgula decimal", () => {
    expect(formatUSD(110)).toBe("US$ 110,00");
    expect(formatUSD(5020)).toBe("US$ 5.020,00");
  });
  it("dinheiro disponível não inclui dívidas nem limite", () => {
    expect(totalAvailableCash(DEMO_ACCOUNTS)).toBe(300);
  });
  it("sem transações nos dados, não inventa", () => {
    expect(answer("Quais foram minhas últimas transações?", DEMO_ACCOUNTS, [])).toContain("Não há transações");
    expect(answer("Quanto gastei por categoria?", DEMO_ACCOUNTS, [])).toContain("Não há despesas");
  });
  it("crédito não informado é dito claramente", () => {
    expect(answer("Quais são minhas contas?")).toContain("crédito disponível não informado");
  });
});

describe("perguntas sobre cartão", () => {
  const r = answer("Posso usar o saldo do cartão de crédito para pagar uma compra?");
  it("não responde sobre transações", () => {
    expect(r).not.toContain("Não há transações");
  });
  it("usa o crédito informado do cartão empresarial", () => {
    expect(r).toContain("crédito disponível US$ 4.980,00");
  });
  it("não inventa o crédito do Plaid Credit Card", () => {
    expect(r).toContain("Plaid Credit Card**: dívida atual US$ 410,00; limite total não informado; crédito disponível não informado");
  });
});

describe("regressão: cada pergunta recebe sua intenção", () => {
  const cases: [string, string][] = [
    ["Quanto dinheiro tenho disponível, sem contar o limite dos cartões de crédito?", "cash"],
    ["Qual é meu saldo disponível?", "cash"],
    ["Posso usar o saldo do cartão de crédito para pagar uma compra?", "card_purchase"],
    ["Posso fazer compras com o cartão?", "card_purchase"],
    ["Qual é a dívida atual dos meus cartões?", "card_debt"],
    ["Quanto devo no cartão?", "card_debt"],
    ["Qual é o limite total do meu cartão?", "card_limit"],
    ["Quanto tenho de crédito disponível?", "card_limit"],
    ["Quais foram minhas últimas transações?", "transactions"],
    ["Quanto gastei por categoria?", "categories"],
    ["Quais são minhas contas?", "accounts"],
  ];
  it.each(cases)("%s → %s", (q, intent) => {
    expect(detectIntent(q)).toBe(intent);
  });

  it("dinheiro disponível sem limite soma só contas bancárias: US$ 300,00", () => {
    const r = answer("Quanto dinheiro tenho disponível, sem contar o limite dos cartões de crédito?");
    expect(r).toContain("**US$ 300,00**");
    expect(r).not.toContain("Sim, um cartão de crédito permite");
    expect(r).not.toContain("4.980");
  });
  it("dívida dos cartões soma US$ 5.430,00", () => {
    expect(answer("Qual é a dívida atual dos meus cartões?")).toContain("**US$ 5.430,00**");
  });
  it("limite não inventa valores", () => {
    const r = answer("Qual é o limite total do meu cartão?");
    expect(r).toContain("Plaid Credit Card**: limite total não informado; crédito disponível não informado");
    expect(r).toContain("Plaid Business Credit Card**: limite total não informado; crédito disponível US$ 4.980,00");
  });
  it("saldo disponível ausente não é inventado nem somado", () => {
    expect(totalAvailableCash([{ id: "x", name: "X", type: "checking", currency: "USD", balance: 50 }])).toBe(0);
  });
});

describe("transações e gastos por categoria", () => {
  it("últimas transações vêm da mais recente para a mais antiga", () => {
    expect(latestTransactions(DEMO_TRANSACTIONS).map((t) => t.id)).toEqual(["t8", "t7", "t6", "t5", "t4"]);
  });
  it("resposta de transações mostra despesa e entrada com sinais", () => {
    const r = answer("Quais foram minhas últimas transações?");
    expect(r).toContain("18/10/2026 · **Combustível** · despesa −US$ 150,00");
    expect(r).toContain("**Rendimento da poupança** · entrada +US$ 1,75");
    expect(r).not.toContain("Salário");
  });
  it("gastos por categoria somam só despesas", () => {
    expect(spendingByCategory(DEMO_TRANSACTIONS)).toEqual([
      { category: "Transporte", total: 173.9 },
      { category: "Alimentação", total: 147.9 },
      { category: "Moradia", total: 120 },
      { category: "Serviços", total: 49 },
    ]);
  });
  it("resposta de categorias traz total US$ 490,80 sem renda", () => {
    const r = answer("Quanto gastei por categoria?");
    expect(r).toContain("**US$ 490,80**");
    expect(r).not.toContain("**Renda**");
  });
  it("transações não alteram o dinheiro disponível", () => {
    expect(answer("Qual é meu saldo disponível?")).toContain("**US$ 300,00**");
  });
});
