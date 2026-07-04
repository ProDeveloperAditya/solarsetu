# SolarSetu

**Rooftop solar ROI estimator for India.** Draw your rooftop on a satellite map and SolarSetu estimates how much solar you can install, how much it will generate, your **PM Surya Ghar subsidy**, and your **payback period and 25-year return** — for any address in the country.

No account, no signup. Trace your roof, get a defensible estimate in seconds.

---

## Why it's different

Most "solar calculators" are a spreadsheet behind a form: you type your bill, they multiply by a magic number. SolarSetu actually models the physics and the policy:

- **Real irradiance for your exact roof** — pulls NASA POWER climatology for the roof's coordinates, not a city-level average.
- **A real transposition model** — Liu-Jordan isotropic transposition converts horizontal irradiance to what your *tilted, oriented* panels actually receive.
- **The PM Surya Ghar subsidy engine** — the tiered central subsidy (₹30k/kW to 2 kW, ₹18k for the 3rd, ₹78k cap) plus optional state top-ups and net metering — the part generic calculators ignore.
- **Shading without 3-D city data** — India has no open building-height dataset, so SolarSetu inverts the problem: you mark the tall building/tree next door and say how much taller than your roof it is; the engine builds a **horizon profile** and simulates the sun's position through every daylight hour of the year to compute a per-month beam-blocking fraction. "The 6 m building to your south costs you 22% in December, 3% in June."
- **Transparent by design** — every assumption (usable area, tilt, azimuth, module density, performance ratio, tariff, cost, escalation, degradation, obstruction heights) is a visible, adjustable control. The estimate is auditable, not a black box.

---

## How the model works

```
Drawn roof polygon
      │  turf.js: geodesic area + orientation
      ▼
Roof geometry ──► NASA POWER API (GHI + diffuse, monthly climatology)
      │                    │
      │  Liu-Jordan isotropic transposition (tilt, azimuth, latitude)
      ▼                    ▼
Plane-of-array irradiance (kWh/m²/yr)
      │  E = kWp × POA × Performance Ratio
      ▼
Annual + monthly generation (kWh)
      │  PM Surya Ghar subsidy · net metering · escalation · degradation
      ▼
Net cost · payback · 25-yr ROI · CO₂ avoided
```

**Production:** `E = kWp × H_POA × PR`, where `H_POA` comes from the monthly isotropic transposition on Klein representative days, and `kWp = usable_area × module_density`.

**Finance:** net cost = gross − PM Surya Ghar subsidy − state subsidy; savings each year grow with tariff escalation and shrink with panel degradation; payback is the fractional year the cumulative savings cross the net cost.

### Validation

Cross-checked against a known benchmark: for New Delhi (28.6°N) the model gives a specific yield of **~1,417 kWh/kWp/yr**, just below the real-world **1,450–1,550** range — i.e. deliberately conservative. Horizontal POA equals GHI exactly (a correctness check), and east-facing roofs correctly lose output versus south. See `__tests__/`.

> The geometry layer is behind a source-agnostic `RoofGeometry` interface, so the manual draw can be swapped for the Google Solar API (where covered) or a CV roof-detector without touching the production or finance models.

---

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **React-Leaflet + Leaflet-Geoman** — satellite map (keyless Esri imagery) + polygon roof drawing
- **Turf.js** — geodesic area and orientation
- **Recharts** — monthly generation + cumulative-savings charts
- **NASA POWER API** — free, global solar irradiance climatology (no key)
- **Vitest** — unit tests for the production and finance models

---

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # run the model unit tests
npm run build    # production build
```

No API keys required — the map (Esri imagery), geocoding (OpenStreetMap Nominatim), and irradiance (NASA POWER) are all keyless.

---

## Deploy (Vercel, free)

1. Push to GitHub.
2. Import the repo at **vercel.com/new** → it auto-detects Next.js.
3. Deploy. No environment variables are needed.

---

## Roadmap

- **Google Solar API** — auto-detect roof geometry for covered addresses (US/EU) for higher accuracy.
- **CV roof detection** — segment the roof from satellite tiles so drawing is optional.
- **PDF report** and **save/compare** across multiple roofs.

---

## Disclaimer

SolarSetu produces an informational estimate based on climatological averages and public subsidy rules, not a professional site survey or financial advice. Actual generation, costs, and subsidies vary by site, vendor, DISCOM, and current government policy.
