import { describe, it, expect } from "vitest";
import {
  buildHorizonProfile,
  monthlyBeamShadeFraction,
  sunPosition,
  type ObstructionInput,
} from "@/lib/shading";
import { declination } from "@/lib/solar";
import type { Feature, Polygon } from "geojson";

const DELHI = { lat: 28.6, lng: 77.2 };
const M_LAT = 1 / 111_320; // degrees latitude per metre
const M_LNG = 1 / (111_320 * Math.cos((28.6 * Math.PI) / 180));

/** A thin wall centred `southM` metres south of the roof, `halfWidthM` wide. */
function wall(
  offsetEastM: number,
  offsetNorthM: number,
  halfWidthM: number,
  alongEast: boolean
): Feature<Polygon> {
  const cx = DELHI.lng + offsetEastM * M_LNG;
  const cy = DELHI.lat + offsetNorthM * M_LAT;
  const dx = alongEast ? halfWidthM * M_LNG : 0.5 * M_LNG;
  const dy = alongEast ? 0.5 * M_LAT : halfWidthM * M_LAT;
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [cx - dx, cy - dy],
          [cx + dx, cy - dy],
          [cx + dx, cy + dy],
          [cx - dx, cy + dy],
          [cx - dx, cy - dy],
        ],
      ],
    },
  };
}

describe("sunPosition", () => {
  it("puts the summer noon sun high and due south in Delhi", () => {
    const sun = sunPosition(28.6, declination(172), 12); // ~June 21
    expect(sun.elevation).toBeGreaterThan(80);
    expect(Math.abs(sun.azimuth - 180)).toBeLessThan(10);
  });

  it("puts the winter noon sun low (~38°) in Delhi", () => {
    const sun = sunPosition(28.6, declination(355), 12); // ~Dec 21
    expect(sun.elevation).toBeGreaterThan(33);
    expect(sun.elevation).toBeLessThan(43);
    expect(Math.abs(sun.azimuth - 180)).toBeLessThan(2);
  });

  it("places the morning sun in the eastern sky", () => {
    const sun = sunPosition(28.6, 0, 8);
    expect(sun.azimuth).toBeGreaterThan(45);
    expect(sun.azimuth).toBeLessThan(135);
  });
});

describe("buildHorizonProfile", () => {
  it("is all zeros with no obstructions", () => {
    const horizon = buildHorizonProfile(DELHI, []);
    expect(horizon.every((v) => v === 0)).toBe(true);
  });

  it("registers a southern wall at ~45° when Δh equals distance", () => {
    const obstruction: ObstructionInput = {
      polygon: wall(0, -10, 15, true), // 10 m south, 30 m wide
      deltaHeightM: 10,
    };
    const horizon = buildHorizonProfile(DELHI, [obstruction]);
    const southBin = Math.floor(180 / 5);
    expect(horizon[southBin]!).toBeGreaterThan(35);
    expect(horizon[southBin]!).toBeLessThan(50);
    // Due north must remain open sky.
    expect(horizon[0]).toBe(0);
  });
});

describe("monthlyBeamShadeFraction", () => {
  it("is zero everywhere for an open horizon", () => {
    const fractions = monthlyBeamShadeFraction(28.6, buildHorizonProfile(DELHI, []));
    expect(fractions).toHaveLength(12);
    expect(fractions.every((f) => f === 0)).toBe(true);
  });

  it("a tall southern building bites winter hard but summer barely", () => {
    // 40°-elevation wall across the whole southern sky quadrant.
    const obstruction: ObstructionInput = {
      polygon: wall(0, -12, 40, true),
      deltaHeightM: 10, // atan(10/12) ≈ 40°
    };
    const horizon = buildHorizonProfile(DELHI, [obstruction]);
    const fractions = monthlyBeamShadeFraction(28.6, horizon);

    const december = fractions[11]!;
    const june = fractions[5]!;
    expect(december).toBeGreaterThan(0.25); // winter noon sun (~38°) is blocked
    expect(june).toBeLessThan(0.15); // summer noon sun (~85°) sails over
    expect(december).toBeGreaterThan(june);
  });

  it("an eastern obstruction costs mornings only (< 60%)", () => {
    const obstruction: ObstructionInput = {
      polygon: wall(10, 0, 40, false), // 10 m east, long north-south wall
      deltaHeightM: 15,
    };
    const horizon = buildHorizonProfile(DELHI, [obstruction]);
    const fractions = monthlyBeamShadeFraction(28.6, horizon);

    for (const fraction of fractions) {
      expect(fraction).toBeGreaterThan(0);
      expect(fraction).toBeLessThan(0.6);
    }
  });

  it("fractions stay within [0, 1]", () => {
    const obstruction: ObstructionInput = {
      polygon: wall(0, -3, 60, true),
      deltaHeightM: 60, // extreme: 87° wall
    };
    const fractions = monthlyBeamShadeFraction(
      28.6,
      buildHorizonProfile(DELHI, [obstruction])
    );
    for (const fraction of fractions) {
      expect(fraction).toBeGreaterThanOrEqual(0);
      expect(fraction).toBeLessThanOrEqual(1);
    }
  });
});
