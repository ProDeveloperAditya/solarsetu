import type { IrradianceData } from "@/lib/solar";

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

/**
 * Proxies NASA POWER's climatology API for a lat/lng and returns 12 months of
 * average daily GHI + diffuse irradiance (kWh/m²/day). Server-side to avoid
 * CORS and to cache the response (climatology is stable — revalidate daily).
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "Valid lat and lng are required." }, { status: 400 });
  }

  const url =
    "https://power.larc.nasa.gov/api/temporal/climatology/point" +
    "?parameters=ALLSKY_SFC_SW_DWN,ALLSKY_SFC_SW_DIFF" +
    `&community=RE&longitude=${lng}&latitude=${lat}&format=JSON`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 86400 },
      // A hung NASA response must not hang this handler with it.
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return Response.json({ error: "NASA POWER is unavailable." }, { status: 502 });
    }

    const data = (await res.json()) as {
      properties?: { parameter?: Record<string, Record<string, number>> };
    };
    const params = data.properties?.parameter;
    const ghiRaw = params?.["ALLSKY_SFC_SW_DWN"];
    const dhiRaw = params?.["ALLSKY_SFC_SW_DIFF"];

    if (!ghiRaw || !dhiRaw) {
      return Response.json({ error: "Unexpected NASA POWER response." }, { status: 502 });
    }

    const ghi = MONTHS.map((m) => Number(ghiRaw[m]));
    // NASA POWER fill value is -999; clamp diffuse into [0, GHI].
    const dhi = MONTHS.map((m, i) => {
      const value = Number(dhiRaw[m]);
      const ceiling = ghi[i] ?? 0;
      return Number.isFinite(value) ? Math.min(Math.max(value, 0), ceiling) : 0;
    });

    // NASA's fill value is -999 and ANN can be absent — validate the annual
    // figure the same way as the monthly series.
    const annualGhi = Number(ghiRaw["ANN"]);
    if (ghi.some((v) => !Number.isFinite(v) || v < 0) || !Number.isFinite(annualGhi) || annualGhi < 0) {
      return Response.json(
        { error: "No solar data is available for this location." },
        { status: 422 }
      );
    }

    const payload: IrradianceData = {
      ghi,
      dhi,
      annualGhi,
    };
    return Response.json(payload);
  } catch {
    return Response.json({ error: "Failed to reach NASA POWER." }, { status: 502 });
  }
}
