/**
 * Solar production model.
 *
 * Pipeline: NASA POWER monthly GHI + diffuse → plane-of-array (POA) irradiance
 * via the Liu-Jordan isotropic transposition on monthly representative days →
 * annual energy via E = kWp × H_POA × PR.
 *
 * All functions are pure and unit-testable. The model is deliberately
 * transparent: every assumption is a named input, not a magic constant.
 */

export interface IrradianceData {
  /** Monthly average daily GHI, kWh/m²/day (Jan…Dec). */
  ghi: number[];
  /** Monthly average daily diffuse irradiance, kWh/m²/day (Jan…Dec). */
  dhi: number[];
  /** Annual average daily GHI from NASA POWER, kWh/m²/day. */
  annualGhi: number;
}

export interface ProductionInputs {
  irradiance: IrradianceData;
  latitude: number;
  /** Panel tilt from horizontal, degrees. */
  tilt: number;
  /** Panel azimuth, degrees (180 = due south). */
  azimuth: number;
  /** Usable roof area for panels, m². */
  usableAreaSqm: number;
  /** Installed DC capacity per usable m², kWp/m² (module + spacing). */
  moduleDensity: number;
  /** Performance ratio (0–1): temperature, soiling, inverter, wiring losses. */
  performanceRatio: number;
  /** Monthly beam fraction blocked by obstructions (0–1 each), from lib/shading. */
  beamShadeMonthly?: number[];
}

export interface ProductionResult {
  systemSizeKwp: number;
  /** Annual plane-of-array insolation, kWh/m²/year. */
  poaAnnual: number;
  /** Specific yield, kWh per kWp per year (H_POA × PR). */
  specificYield: number;
  /** Annual AC energy, kWh/year. */
  annualEnergyKwh: number;
  /** Per-month AC energy, kWh (Jan…Dec). */
  monthlyEnergyKwh: number[];
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
// Klein's recommended average day-of-year for each month.
export const REPRESENTATIVE_DOY = [17, 47, 75, 105, 135, 162, 198, 228, 258, 288, 318, 344];
const GROUND_ALBEDO = 0.2;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Solar declination for a given day-of-year (Cooper's equation), degrees. */
export function declination(dayOfYear: number): number {
  return 23.45 * Math.sin(toRad((360 * (284 + dayOfYear)) / 365));
}

/**
 * Ratio of monthly-average beam irradiance on a tilted, equator-facing surface
 * to that on the horizontal (Liu & Jordan). Northern-hemisphere tuned via
 * |latitude|; India (and the US bonus path) are all north.
 */
export function beamRatio(latitude: number, tilt: number, declDeg: number): number {
  const phi = toRad(Math.abs(latitude));
  const beta = toRad(tilt);
  const decl = toRad(declDeg);

  const sunsetHorizontal = Math.acos(clamp(-Math.tan(phi) * Math.tan(decl), -1, 1));
  const sunsetTilted = Math.min(
    sunsetHorizontal,
    Math.acos(clamp(-Math.tan(phi - beta) * Math.tan(decl), -1, 1))
  );

  const numerator =
    Math.cos(phi - beta) * Math.cos(decl) * Math.sin(sunsetTilted) +
    sunsetTilted * Math.sin(phi - beta) * Math.sin(decl);
  const denominator =
    Math.cos(phi) * Math.cos(decl) * Math.sin(sunsetHorizontal) +
    sunsetHorizontal * Math.sin(phi) * Math.sin(decl);

  return denominator > 0 ? Math.max(0, numerator / denominator) : 0;
}

/**
 * Empirical annual derate for facing away from the equator. ~6% loss at ±45°,
 * ~20% at ±90° (east/west), matching published rooftop studies. Applied to the
 * beam component only.
 */
export function azimuthFactor(azimuth: number): number {
  const deviation = toRad(Math.abs(azimuth - 180));
  return 1 - 0.2 * (1 - Math.cos(deviation));
}

/**
 * Monthly-average daily POA irradiance (kWh/m²/day) via isotropic transposition.
 *
 * `beamShadeMonthly` (0–1 per month, optional) is the fraction of beam
 * irradiance blocked by user-marked obstructions — produced by the horizon
 * simulation in `lib/shading.ts`. Only the beam component is reduced; under
 * the isotropic assumption, diffuse is left intact (a slight, honest
 * overestimate for heavily obstructed skies).
 */
export function transposeToPoa(
  irradiance: IrradianceData,
  latitude: number,
  tilt: number,
  azimuth: number,
  beamShadeMonthly?: number[]
): number[] {
  const beta = toRad(tilt);
  // Azimuth only matters once the panel is tilted — a horizontal panel has no
  // facing direction, so the off-south penalty is scaled in with sin(tilt).
  const azFactor = 1 - (1 - azimuthFactor(azimuth)) * Math.sin(beta);
  const skyView = (1 + Math.cos(beta)) / 2;
  const groundView = (1 - Math.cos(beta)) / 2;

  return irradiance.ghi.map((ghi, month) => {
    const diffuse = clamp(irradiance.dhi[month] ?? 0, 0, ghi);
    const beam = Math.max(0, ghi - diffuse);
    const rb = beamRatio(latitude, tilt, declination(REPRESENTATIVE_DOY[month] ?? 172));
    const shadeKeep = 1 - clamp(beamShadeMonthly?.[month] ?? 0, 0, 1);

    return (
      beam * rb * azFactor * shadeKeep +
      diffuse * skyView +
      ghi * GROUND_ALBEDO * groundView
    );
  });
}

/** Full production estimate for a system on this roof. */
export function estimateProduction(inputs: ProductionInputs): ProductionResult {
  const {
    irradiance,
    latitude,
    tilt,
    azimuth,
    usableAreaSqm,
    moduleDensity,
    performanceRatio,
    beamShadeMonthly,
  } = inputs;

  const systemSizeKwp = usableAreaSqm * moduleDensity;
  const poaDaily = transposeToPoa(irradiance, latitude, tilt, azimuth, beamShadeMonthly);

  const monthlyPoa = poaDaily.map((daily, m) => daily * (DAYS_IN_MONTH[m] ?? 30));
  const poaAnnual = monthlyPoa.reduce((sum, v) => sum + v, 0);

  const specificYield = poaAnnual * performanceRatio;
  const annualEnergyKwh = systemSizeKwp * specificYield;
  const monthlyEnergyKwh = monthlyPoa.map(
    (poa) => systemSizeKwp * poa * performanceRatio
  );

  return {
    systemSizeKwp,
    poaAnnual,
    specificYield,
    annualEnergyKwh,
    monthlyEnergyKwh,
  };
}

/** Rough optimal fixed tilt for a latitude (used as a UI hint). */
export function optimalTilt(latitude: number): number {
  return Math.round(Math.abs(latitude));
}
