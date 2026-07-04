/**
 * Financial model: system cost → PM Surya Ghar subsidy → net cost → payback &
 * lifetime ROI, accounting for tariff escalation and panel degradation.
 *
 * Pure and unit-testable. Assumes 1:1 net metering (every generated unit offsets
 * a grid unit at the retail tariff) — the norm for residential systems ≤10 kW in
 * most Indian states.
 */

export interface FinanceInputs {
  systemSizeKwp: number;
  annualEnergyKwh: number;
  /** Gross installed cost, ₹ per kWp (before subsidy). */
  costPerKwp: number;
  /** Retail electricity tariff, ₹ per kWh. */
  tariff: number;
  /** Optional flat state-government subsidy, ₹. */
  stateSubsidy: number;
  /** Annual tariff escalation, %. */
  tariffEscalationPct: number;
  /** Annual panel degradation, %. */
  degradationPct: number;
  /** Analysis horizon, years. */
  horizonYears: number;
}

export interface FinanceYear {
  year: number;
  generationKwh: number;
  savings: number;
  cumulativeSavings: number;
  netPosition: number;
}

export interface FinanceResult {
  grossCost: number;
  centralSubsidy: number;
  stateSubsidy: number;
  netCost: number;
  year1Savings: number;
  /** Fractional years to recover net cost; null if not within the horizon. */
  paybackYears: number | null;
  lifetimeSavings: number;
  lifetimeNetSavings: number;
  /** Lifetime net savings as a % of net cost. */
  roiPct: number;
  co2AvoidedTonnes: number;
  schedule: FinanceYear[];
}

// CEA grid emission factor for India (kg CO2 per kWh).
const GRID_EMISSION_FACTOR = 0.71;

/**
 * PM Surya Ghar: Muft Bijli Yojana central subsidy (residential rooftop).
 * ₹30,000/kW for the first 2 kW, ₹18,000/kW for the 3rd, capped at ₹78,000 (≥3 kW).
 */
export function pmSuryaGharSubsidy(kwp: number): number {
  if (kwp <= 0) return 0;
  if (kwp <= 2) return 30_000 * kwp;
  if (kwp < 3) return 60_000 + 18_000 * (kwp - 2);
  return 78_000;
}

export function computeFinance(inputs: FinanceInputs): FinanceResult {
  const {
    systemSizeKwp,
    annualEnergyKwh,
    costPerKwp,
    tariff,
    stateSubsidy,
    tariffEscalationPct,
    degradationPct,
    horizonYears,
  } = inputs;

  const grossCost = systemSizeKwp * costPerKwp;
  const centralSubsidy = pmSuryaGharSubsidy(systemSizeKwp);
  const netCost = Math.max(0, grossCost - centralSubsidy - stateSubsidy);

  const degradation = degradationPct / 100;
  const escalation = tariffEscalationPct / 100;

  const schedule: FinanceYear[] = [];
  let cumulativeSavings = 0;
  let cumulativeGeneration = 0;
  let paybackYears: number | null = null;

  for (let year = 1; year <= horizonYears; year++) {
    const generationKwh = annualEnergyKwh * Math.pow(1 - degradation, year - 1);
    const yearTariff = tariff * Math.pow(1 + escalation, year - 1);
    const savings = generationKwh * yearTariff;

    const previousCumulative = cumulativeSavings;
    cumulativeSavings += savings;
    cumulativeGeneration += generationKwh;

    // Fractional-year payback via linear interpolation within the crossing year.
    if (paybackYears === null && cumulativeSavings >= netCost) {
      const shortfall = netCost - previousCumulative;
      paybackYears = year - 1 + (savings > 0 ? shortfall / savings : 0);
    }

    schedule.push({
      year,
      generationKwh,
      savings,
      cumulativeSavings,
      netPosition: cumulativeSavings - netCost,
    });
  }

  const lifetimeSavings = cumulativeSavings;
  const lifetimeNetSavings = lifetimeSavings - netCost;

  return {
    grossCost,
    centralSubsidy,
    stateSubsidy,
    netCost,
    year1Savings: schedule[0]?.savings ?? 0,
    paybackYears,
    lifetimeSavings,
    lifetimeNetSavings,
    roiPct: netCost > 0 ? (lifetimeNetSavings / netCost) * 100 : 0,
    co2AvoidedTonnes: (cumulativeGeneration * GRID_EMISSION_FACTOR) / 1000,
    schedule,
  };
}
