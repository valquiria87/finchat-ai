import { describe, expect, it } from "vitest";
import { DEMO_ACCOUNTS, DEMO_TRANSACTIONS } from "@/lib/finance";
import { buildFinancialInsights } from "@/lib/financial-insights";

describe("insights financeiros explicáveis", () => {
  it("identifica a categoria com maior gasto e a maior despesa individual", () => {
    const result = buildFinancialInsights(DEMO_ACCOUNTS, DEMO_TRANSACTIONS);

    expect(result).toContain("8 movimentações");
    expect(result).toContain("Transporte");
    expect(result).toContain("Combustível");
    expect(result).toContain("R$ 150,00");
    expect(result).toContain("dados simulados");
  });

  it("não inventa conclusões quando não há transações", () => {
    const result = buildFinancialInsights(DEMO_ACCOUNTS, []);

    expect(result).toContain("Ainda não há transações");
    expect(result).not.toContain("Maior concentração de gastos");
  });

  it("mantém moedas separadas em vez de somar valores incompatíveis", () => {
    const transactions = [
      { id: "brl", accountId: "brl-account", date: "2026-10-01", description: "Compra BRL", amount: 100, category: "Compras", currency: "BRL" },
      { id: "usd", accountId: "usd-account", date: "2026-10-02", description: "Compra USD", amount: 25, category: "Compras", currency: "USD" },
    ];
    const result = buildFinancialInsights([], transactions, "pluggy");

    expect(result).toContain("BRL");
    expect(result).toContain("USD");
    expect(result).toContain("R$ 100,00");
    expect(result).toContain("US$");
    expect(result).toContain("não foram convertidos entre moedas");
    expect(result).not.toContain("R$ 125,00");
  });
});
