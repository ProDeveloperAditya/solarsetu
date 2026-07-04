/**
 * Shading model without 3D city data.
 *
 * India has no reliable open building-height dataset, so automatic shading is
 * impossible. Instead we invert the problem: the homeowner marks nearby
 * obstructions (buildings, trees) on the map and says how much taller than
 * the roof each one is. From those we build a **horizon profile** — the
 * skyline elevation angle in every compass direction — then simulate the
 * sun's position through every daylight hour of a representative day per
 * month. Whenever the sun sits below the horizon profile, its beam is
 * blocked. The result is a per-month blocked fraction of beam irradiance,
 * weighted by intensity (sin of solar elevation), which feeds straight into
 * the Liu-Jordan transposition in `lib/solar.ts`.
 */

import type { Feature, Polygon } from "geojson";
import { declination, REPRESENTATIVE_DOY } from "./solar";

export interface ObstructionInput {
  polygon: Feature<Polygon>;
  /** How much taller the obstruction is than the roof, in metres. */
  deltaHeightM: number;
}

/** Degrees per horizon bin (72 bins × 5° = full compass). */
const BIN_DEG = 5;
const BIN_COUNT = 360 / BIN_DEG;
/** Samples along each obstruction edge when tracing its silhouette. */
const EDGE_SAMPLES = 24;
/** Simulation step through the day, in hours (10 minutes). */
const TIME_STEP_H = 1 / 6;

const METERS_PER_DEG_LAT = 111_320;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Build the horizon profile seen from the roof: for each 5° compass bin, the
 * highest obstruction elevation angle (degrees above horizontal).
 */
export function buildHorizonProfile(
  roofCentroid: { lat: number; lng: number },
  obstructions: ObstructionInput[]
): number[] {
  const horizon = new Array<number>(BIN_COUNT).fill(0);
  const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos(toRad(roofCentroid.lat));

  for (const obstruction of obstructions) {
    if (obstruction.deltaHeightM <= 0) continue;
    const ring = obstruction.polygon.geometry.coordinates[0] ?? [];

    for (let i = 0; i < ring.length - 1; i++) {
      const [lngA, latA] = ring[i] ?? [0, 0];
      const [lngB, latB] = ring[i + 1] ?? [0, 0];

      for (let s = 0; s <= EDGE_SAMPLES; s++) {
        const t = s / EDGE_SAMPLES;
        const lng = lngA + (lngB - lngA) * t;
        const lat = latA + (latB - latA) * t;

        const eastM = (lng - roofCentroid.lng) * metersPerDegLng;
        const northM = (lat - roofCentroid.lat) * METERS_PER_DEG_LAT;
        const distanceM = Math.hypot(eastM, northM);
        if (distanceM < 0.5) continue; // overlapping the roof itself

        const azimuth = (toDeg(Math.atan2(eastM, northM)) + 360) % 360;
        const elevation = toDeg(Math.atan2(obstruction.deltaHeightM, distanceM));

        const bin = Math.floor(azimuth / BIN_DEG) % BIN_COUNT;
        if (elevation > (horizon[bin] ?? 0)) horizon[bin] = elevation;
      }
    }
  }

  return horizon;
}

export interface SunPosition {
  /** Elevation above the horizon, degrees (negative = below). */
  elevation: number;
  /** Compass azimuth, degrees from north (90 = east, 180 = south). */
  azimuth: number;
}

/**
 * Solar position from latitude, declination, and solar time (standard
 * spherical-astronomy formulas; accurate to well under a degree, which is
 * plenty against a 5°-binned horizon).
 */
export function sunPosition(
  latitudeDeg: number,
  declinationDeg: number,
  solarTimeH: number
): SunPosition {
  const phi = toRad(latitudeDeg);
  const delta = toRad(declinationDeg);
  const hourAngle = toRad(15 * (solarTimeH - 12));

  const sinElev =
    Math.sin(phi) * Math.sin(delta) +
    Math.cos(phi) * Math.cos(delta) * Math.cos(hourAngle);
  const elevation = Math.asin(clamp(sinElev, -1, 1));

  const cosAz =
    (Math.sin(delta) - Math.sin(elevation) * Math.sin(phi)) /
    (Math.cos(elevation) * Math.cos(phi) || 1e-9);
  let azimuth = toDeg(Math.acos(clamp(cosAz, -1, 1)));
  if (solarTimeH > 12) azimuth = 360 - azimuth; // afternoon → western sky

  return { elevation: toDeg(elevation), azimuth };
}

/**
 * For each month, the fraction of beam irradiance blocked by the horizon
 * profile on the representative day, weighted by sin(elevation) as a proxy
 * for instantaneous beam intensity.
 */
export function monthlyBeamShadeFraction(
  latitudeDeg: number,
  horizon: number[]
): number[] {
  return REPRESENTATIVE_DOY.map((dayOfYear) => {
    const declDeg = declination(dayOfYear);
    let blockedWeight = 0;
    let totalWeight = 0;

    for (let t = 4.5; t <= 19.5; t += TIME_STEP_H) {
      const sun = sunPosition(latitudeDeg, declDeg, t);
      if (sun.elevation <= 0.5) continue; // below or grazing the horizon

      const weight = Math.sin(toRad(sun.elevation));
      totalWeight += weight;

      const bin = Math.floor(sun.azimuth / BIN_DEG) % BIN_COUNT;
      if (sun.elevation < (horizon[bin] ?? 0)) blockedWeight += weight;
    }

    return totalWeight > 0 ? blockedWeight / totalWeight : 0;
  });
}
