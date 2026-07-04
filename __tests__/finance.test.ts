import { describe, it, expect } from "vitest";
import { pmSuryaGharSubsidy, computeFinance } from "@/lib/finance";

describe("pmSuryaGharSubsidy", () => {
  it("applies the tiered slabs correctly", () => {
    expect(pmSuryaGharSubsidy(1)).toBe(30_000);
    expect(pmSuryaGharSubsidy(2)).toBe(60_000);
    expect(pmSuryaGharSubsidy(3)).toBe(78_000);
  });

  it("caps at ₹78,000 for systems 3 kW and larger", () => {
    expect(pmSuryaGharSubsidy(5)).toBe(78_000);
    expect(pmSuryaGharSubsidy(10)).toBe(78_000);
  });

  it("is zero for non-positive capacity", () => {
    expect(pmSuryaGharSubsidy(0)).toBe(0);
    expect(pmSuryaGharSubsidy(-1)).toBe(0);
  });
});

describe("computeFinance", () => {
  const base = {
    systemSizeKwp: 3,
    annualEnergyKwh: 4260,
    costPerKwp: 55_000,
    tariff: 8,
    stateSubsidy: 0,
    tariffEscalationPct: 3,
    degradationPct: 0.6,
    horizonYears: 25,
  };

  it("nets out gross cost minus the central subsidy", () => {
    const r = computeFinance(base);
    expect(r.grossCost).toBe(165_000);
    expect(r.centralSubsidy).toBe(78_000);
    expect(r.netCost).toBe(87_000);
  });

  it("subtracts an optional state subsidy", () => {
    const r = computeFinance({ ...base, stateSubsidy: 20_000 });
    expect(r.netCost).toBe(67_000);
  });

  it("computes a realistic sub-5-year payback for a subsidised Delhi system", () => {
    const r = computeFinance(base);
    expect(r.paybackYears).not.toBeNull();
    expect(r.paybackYears!).toBeGreaterThan(1);
    expect(r.paybackYears!).toBeLessThan(5);
  });

  it("produces a full 25-year schedule with positive lifetime savings", () => {
    const r = computeFinance(base);
    expect(r.schedule).toHaveLength(25);
    expect(r.lifetimeNetSavings).toBeGreaterThan(0);
    expect(r.roiPct).toBeGreaterThan(0);
  });

  it("degrades generation year over year", () => {
    const r = computeFinance(base);
    expect(r.schedule[1]!.generationKwh).toBeLessThan(
      r.schedule[0]!.generationKwh
    );
  });

  it("reports no payback when savings never cover the cost", () => {
    const r = computeFinance({ ...base, tariff: 0 });
    expect(r.paybackYears).toBeNull();
  });
});
