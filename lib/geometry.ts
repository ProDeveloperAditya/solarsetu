import * as turf from "@turf/turf";
import type { Feature, Polygon } from "geojson";

export interface RoofGeometry {
  /** Roof footprint area in square metres (geodesic). */
  areaSqm: number;
  /** Centroid — used later to fetch irradiance for this exact location. */
  centroid: { lat: number; lng: number };
  /**
   * Compass bearing (0–360°, 0 = North) of the roof footprint's longest edge.
   * This is a *hint* for panel azimuth, not a determination: a top-down
   * footprint can't reveal which way a sloped roof actually faces.
   */
  footprintBearing: number;
}

/**
 * Derive area, centroid, and a footprint orientation hint from a drawn polygon.
 * The `RoofGeometry` shape is deliberately source-agnostic so a manual draw,
 * the Google Solar API, or a future CV roof-detector can all produce it.
 */
export function analyzePolygon(polygon: Feature<Polygon>): RoofGeometry {
  const areaSqm = turf.area(polygon);

  const [lng, lat] = turf.centroid(polygon).geometry.coordinates;

  const ring = polygon.geometry.coordinates[0] ?? [];
  let longest = 0;
  let bearing = 180;
  for (let i = 0; i < ring.length - 1; i++) {
    const from = turf.point(ring[i]);
    const to = turf.point(ring[i + 1]);
    const length = turf.distance(from, to);
    if (length > longest) {
      longest = length;
      bearing = (turf.bearing(from, to) + 360) % 360;
    }
  }

  return {
    areaSqm,
    centroid: { lat, lng },
    footprintBearing: Math.round(bearing),
  };
}
