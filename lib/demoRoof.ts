import type { Feature, Polygon } from "geojson";

/**
 * A sample ~42 m² rooftop in Lajpat Nagar, New Delhi (28.57°N) — a realistic
 * independent-house roof yielding a ~5–6 kWp system, which lands right in the
 * sweet spot of the PM Surya Ghar subsidy tiers.
 *
 * Returns a fresh object each call so consumers can use reference identity to
 * re-trigger map effects when the demo is loaded again.
 */
export function makeDemoRoof(): Feature<Polygon> {
  return {
    type: "Feature",
    properties: { demo: true },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [77.2433, 28.5677],
          [77.243372, 28.5677],
          [77.243372, 28.567754],
          [77.2433, 28.567754],
          [77.2433, 28.5677],
        ],
      ],
    },
  };
}
