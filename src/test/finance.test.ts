import { describe, it, expect } from "vitest";
import { answer, formatUSD, totalAvailableCash, DEMO_ACCOUNTS } from "@/lib/finance";

describe("regras financeiras", () => {
  it("formata em US$ com vírgula decimal", () => {
    expect(formatUSD(110)).toBe("US$ 110,00");
    expect(formatUSD(5020)).toBe("US$ 5.020,00");
  });
  it("dinheiro disponível não inclui dívidas nem limite", () => {
    expect(totalAvailableCash(DEMO_ACCOUNTS)).toBe(300);
  });
  it("não inventa transações", () => {
    expect(answer("Quais foram minhas últimas transações?")).toContain("Não há transações");
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
