import { describe, it, expect } from "vitest";
import {
  beamRatio,
  azimuthFactor,
  transposeToPoa,
  estimateProduction,
  optimalTilt,
  type IrradianceData,
} from "@/lib/solar";

// Real NASA POWER climatology for New Delhi (28.6°N) — annual GHI ≈ 4.89 kWh/m²/day.
const DELHI: IrradianceData = {
  ghi: [3.09, 4.35, 5.65, 6.58, 6.71, 6.09, 5.01, 4.89, 5.06, 4.66, 3.58, 3.03],
  dhi: [1.53, 1.77, 2.03, 2.46, 2.83, 3.03, 2.92, 2.65, 2.26, 1.89, 1.63, 1.41],
  annualGhi: 4.89,
};

describe("azimuthFactor", () => {
  it("is 1.0 due south and penalises east/west", () => {
    expect(azimuthFactor(180)).toBeCloseTo(1, 5);
    expect(azimuthFactor(135)).toBeLessThan(1);
    expect(azimuthFactor(135)).toBeCloseTo(azimuthFactor(225), 5); // symmetric
    expect(azimuthFactor(90)).toBeLessThan(azimuthFactor(135)); // east worse than SE
  });
});

describe("beamRatio", () => {
  it("is ~1.0 for a horizontal surface (no tilt)", () => {
    expect(beamRatio(28.6, 0, -20)).toBeCloseTo(1, 2);
  });

  it("boosts beam on a tilted surface in winter", () => {
    // December declination ≈ -23°; tilting toward the sun should gain beam.
    expect(beamRatio(28.6, 30, -23)).toBeGreaterThan(1);
  });
});

describe("transposeToPoa", () => {
  it("equals GHI for a flat panel", () => {
    const poa = transposeToPoa(DELHI, 28.6, 0, 180);
    poa.forEach((v, m) => expect(v).toBeCloseTo(DELHI.ghi[m]!, 3));
  });

  it("ignores azimuth for a flat panel (no facing direction at tilt 0)", () => {
    const poa = transposeToPoa(DELHI, 28.6, 0, 90);
    poa.forEach((v, m) => expect(v).toBeCloseTo(DELHI.ghi[m]!, 3));
  });

  it("gains annual insolation at optimal tilt vs flat", () => {
    const flat = transposeToPoa(DELHI, 28.6, 0, 180).reduce((a, b) => a + b, 0);
    const tilted = transposeToPoa(DELHI, 28.6, 29, 180).reduce((a, b) => a + b, 0);
    expect(tilted).toBeGreaterThan(flat);
  });
});

describe("estimateProduction", () => {
  const base = {
    irradiance: DELHI,
    latitude: 28.6,
    tilt: 29,
    azimuth: 180,
    usableAreaSqm: 100,
    moduleDensity: 0.18,
    performanceRatio: 0.75,
  };

  it("produces a realistic Delhi specific yield (1300–1600 kWh/kWp)", () => {
    const r = estimateProduction(base);
    expect(r.specificYield).toBeGreaterThan(1300);
    expect(r.specificYield).toBeLessThan(1600);
  });

  it("scales capacity and energy with usable area", () => {
    const r = estimateProduction(base);
    expect(r.systemSizeKwp).toBeCloseTo(18, 5);
    const half = estimateProduction({ ...base, usableAreaSqm: 50 });
    expect(half.annualEnergyKwh).toBeCloseTo(r.annualEnergyKwh / 2, 5);
  });

  it("penalises east-facing vs south-facing", () => {
    const south = estimateProduction(base).annualEnergyKwh;
    const east = estimateProduction({ ...base, azimuth: 90 }).annualEnergyKwh;
    expect(east).toBeLessThan(south);
  });

  it("returns 12 months of generation summing to the annual total", () => {
    const r = estimateProduction(base);
    expect(r.monthlyEnergyKwh).toHaveLength(12);
    const sum = r.monthlyEnergyKwh.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(r.annualEnergyKwh, 3);
  });
});

describe("optimalTilt", () => {
  it("approximates the latitude", () => {
    expect(optimalTilt(28.6)).toBe(29);
    expect(optimalTilt(13.1)).toBe(13);
  });
});
