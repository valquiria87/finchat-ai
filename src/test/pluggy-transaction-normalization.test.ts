import { describe, expect, it } from "vitest";
import { normalizePluggyTransactionDirection } from "@/lib/supabase.server";

describe("normalizePluggyTransactionDirection", () => {
  it("normalizes a DEBIT to a positive expense even when the source amount is negative", () => {
    expect(normalizePluggyTransactionDirection({ amount: -42.5, type: "DEBIT" })).toEqual({
      amount: 42.5,
      type: "DEBITO",
    });
  });

  it("normalizes a CREDIT to a negative inflow even when the source amount is positive", () => {
    expect(normalizePluggyTransactionDirection({ amount: 120, type: "CREDIT" })).toEqual({
      amount: -120,
      type: "CREDITO",
    });
  });

  it("supports lowercase Pluggy direction values", () => {
    expect(normalizePluggyTransactionDirection({ amount: 8, type: "debit" })).toEqual({
      amount: 8,
      type: "DEBITO",
    });
  });

  it("uses the legacy amount sign only when the provider direction is missing or unknown", () => {
    expect(normalizePluggyTransactionDirection({ amount: -3 })).toEqual({
      amount: -3,
      type: "CREDITO",
    });
    expect(normalizePluggyTransactionDirection({ amount: 3, type: "OTHER" })).toEqual({
      amount: 3,
      type: "DEBITO",
    });
  });
});
