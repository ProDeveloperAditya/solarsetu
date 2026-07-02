"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Sun,
  MapPin,
  Compass,
  Maximize2,
  Info,
  Zap,
  Gauge,
  Loader2,
  Clock,
  Wallet,
  TrendingUp,
  Leaf,
  BadgeIndianRupee,
} from "lucide-react";
import type { Feature, Polygon } from "geojson";
import { analyzePolygon, type RoofGeometry } from "@/lib/geometry";
import {
  estimateProduction,
  optimalTilt,
  type IrradianceData,
  type ProductionResult,
} from "@/lib/solar";
import { computeFinance, type FinanceResult } from "@/lib/finance";
import { MonthlyGenerationChart, SavingsChart } from "./ResultCharts";

const HORIZON_YEARS = 25;

function inr(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

// Leaflet touches `window`, so the map is client-only (no SSR).
const RoofMap = dynamic(
  () => import("./RoofMap").then((m) => m.RoofMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-400">
        Loading satellite map…
      </div>
    ),
  }
);

function fmt(n: number, digits = 0): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: digits });
}

function StatRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
        highlight ? "bg-amber-500/10 ring-1 ring-amber-500/30" : "bg-slate-800/60"
      }`}
    >
      <span className="flex items-center gap-2 text-sm text-slate-400">
        {icon}
        {label}
      </span>
      <span
        className={`font-mono text-sm font-medium ${
          highlight ? "text-amber-300" : "text-slate-100"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function RoofEstimator() {
  const [roof, setRoof] = useState<Feature<Polygon> | null>(null);
  const [usablePct, setUsablePct] = useState(80);
  const [tilt, setTilt] = useState(20);
  const [azimuth, setAzimuth] = useState(180);
  const [moduleDensity, setModuleDensity] = useState(0.18); // kWp per usable m²
  const [performanceRatio, setPerformanceRatio] = useState(75); // %

  // Finance assumptions
  const [costPerKwp, setCostPerKwp] = useState(55000); // ₹/kWp gross
  const [tariff, setTariff] = useState(8); // ₹/kWh
  const [stateSubsidy, setStateSubsidy] = useState(0); // ₹ flat
  const [tariffEscalation, setTariffEscalation] = useState(3); // %/yr
  const [degradation, setDegradation] = useState(0.6); // %/yr

  const [irradiance, setIrradiance] = useState<IrradianceData | null>(null);
  const [irrLoading, setIrrLoading] = useState(false);
  const [irrError, setIrrError] = useState<string | null>(null);

  const geometry: RoofGeometry | null = useMemo(
    () => (roof ? analyzePolygon(roof) : null),
    [roof]
  );

  const lat = geometry?.centroid.lat ?? null;
  const lng = geometry?.centroid.lng ?? null;

  // Fetch site irradiance whenever the roof (and thus its location) changes.
  useEffect(() => {
    if (lat == null || lng == null) {
      setIrradiance(null);
      return;
    }
    const controller = new AbortController();
    setIrrLoading(true);
    setIrrError(null);
    fetch(`/api/irradiance?lat=${lat}&lng=${lng}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load solar data.");
        setIrradiance(data as IrradianceData);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") {
          setIrradiance(null);
          setIrrError(err.message);
        }
      })
      .finally(() => setIrrLoading(false));
    return () => controller.abort();
  }, [lat, lng]);

  const usableArea = geometry ? (geometry.areaSqm * usablePct) / 100 : 0;

  const production: ProductionResult | null = useMemo(() => {
    if (!geometry || !irradiance) return null;
    return estimateProduction({
      irradiance,
      latitude: geometry.centroid.lat,
      tilt,
      azimuth,
      usableAreaSqm: usableArea,
      moduleDensity,
      performanceRatio: performanceRatio / 100,
    });
  }, [geometry, irradiance, tilt, azimuth, usableArea, moduleDensity, performanceRatio]);

  const finance: FinanceResult | null = useMemo(() => {
    if (!production || production.systemSizeKwp <= 0) return null;
    return computeFinance({
      systemSizeKwp: production.systemSizeKwp,
      annualEnergyKwh: production.annualEnergyKwh,
      costPerKwp,
      tariff,
      stateSubsidy,
      tariffEscalationPct: tariffEscalation,
      degradationPct: degradation,
      horizonYears: HORIZON_YEARS,
    });
  }, [production, costPerKwp, tariff, stateSubsidy, tariffEscalation, degradation]);

  const tiltHint = geometry ? optimalTilt(geometry.centroid.lat) : null;

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center gap-2 border-b border-slate-800 px-5 py-3">
        <Sun className="h-6 w-6 text-amber-400" />
        <h1 className="text-lg font-semibold tracking-tight">
          Solar<span className="text-amber-400">Setu</span>
        </h1>
        <span className="ml-2 hidden text-xs text-slate-500 sm:inline">
          Rooftop solar ROI estimator · India
        </span>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="relative min-h-[45vh] flex-1">
          <RoofMap onRoofChange={setRoof} />
        </div>

        <aside className="w-full shrink-0 space-y-4 overflow-y-auto border-t border-slate-800 p-5 lg:w-96 lg:border-l lg:border-t-0">
          {!geometry ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-5 text-sm leading-relaxed text-slate-400">
              <p className="mb-2 flex items-center gap-2 font-medium text-slate-200">
                <Maximize2 className="h-4 w-4 text-amber-400" />
                Draw your roof
              </p>
              Search your address, then trace your rooftop with the polygon or
              rectangle tool (top-right of the map). Generation and savings appear
              here.
            </div>
          ) : (
            <div className="space-y-2">
              <StatRow
                icon={<Maximize2 className="h-4 w-4" />}
                label={`Usable area (${usablePct}%)`}
                value={`${fmt(usableArea)} m²`}
              />
              <StatRow
                icon={<Zap className="h-4 w-4" />}
                label="System size"
                value={
                  production ? `${fmt(production.systemSizeKwp, 1)} kWp` : "—"
                }
              />

              {irrLoading && (
                <div className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-3 py-2.5 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching solar data for this location…
                </div>
              )}
              {irrError && (
                <div className="rounded-lg bg-red-500/10 px-3 py-2.5 text-sm text-red-300 ring-1 ring-red-500/30">
                  {irrError}
                </div>
              )}

              {production && (
                <>
                  <StatRow
                    icon={<Sun className="h-4 w-4" />}
                    label="Annual generation"
                    value={`${fmt(production.annualEnergyKwh)} kWh`}
                    highlight
                  />
                  <StatRow
                    icon={<Gauge className="h-4 w-4" />}
                    label="Specific yield"
                    value={`${fmt(production.specificYield)} kWh/kWp`}
                  />
                  <StatRow
                    icon={<Sun className="h-4 w-4" />}
                    label="POA irradiance"
                    value={`${fmt(production.poaAnnual)} kWh/m²/yr`}
                  />
                </>
              )}

              <StatRow
                icon={<Compass className="h-4 w-4" />}
                label="Footprint bearing"
                value={`${geometry.footprintBearing}°`}
              />
              <StatRow
                icon={<MapPin className="h-4 w-4" />}
                label="Location"
                value={`${geometry.centroid.lat.toFixed(3)}, ${geometry.centroid.lng.toFixed(3)}`}
              />
            </div>
          )}

          {/* Finance headline */}
          {finance && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-amber-500/10 p-3 ring-1 ring-amber-500/30">
                  <p className="flex items-center gap-1.5 text-xs text-amber-200/70">
                    <Clock className="h-3.5 w-3.5" /> Payback
                  </p>
                  <p className="mt-1 font-mono text-xl font-semibold text-amber-300">
                    {finance.paybackYears != null
                      ? `${finance.paybackYears.toFixed(1)} yrs`
                      : `> ${HORIZON_YEARS} yrs`}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-500/10 p-3 ring-1 ring-emerald-500/30">
                  <p className="flex items-center gap-1.5 text-xs text-emerald-200/70">
                    <TrendingUp className="h-3.5 w-3.5" /> 25-yr savings
                  </p>
                  <p className="mt-1 font-mono text-xl font-semibold text-emerald-300">
                    {inr(finance.lifetimeNetSavings)}
                  </p>
                </div>
              </div>
              <StatRow
                icon={<Wallet className="h-4 w-4" />}
                label="Net cost after subsidy"
                value={inr(finance.netCost)}
              />
              <StatRow
                icon={<BadgeIndianRupee className="h-4 w-4" />}
                label="PM Surya Ghar subsidy"
                value={`− ${inr(finance.centralSubsidy)}`}
              />
              <StatRow
                icon={<Wallet className="h-4 w-4" />}
                label="Year-1 savings"
                value={inr(finance.year1Savings)}
              />
              <StatRow
                icon={<TrendingUp className="h-4 w-4" />}
                label="Lifetime ROI"
                value={`${fmt(finance.roiPct)}%`}
              />
              <StatRow
                icon={<Leaf className="h-4 w-4" />}
                label="CO₂ avoided (25 yr)"
                value={`${fmt(finance.co2AvoidedTonnes, 1)} t`}
              />
            </div>
          )}

          {/* Charts */}
          {production && finance && (
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <MonthlyGenerationChart production={production} />
              <SavingsChart finance={finance} />
            </div>
          )}

          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
              <Info className="h-3.5 w-3.5" />
              Assumptions
            </p>

            <Slider
              label="Usable roof"
              value={usablePct}
              min={40}
              max={95}
              step={5}
              suffix="%"
              onChange={setUsablePct}
              hint="Footprint fraction that can hold panels (setbacks, tanks, shading)."
            />
            <Slider
              label="Panel tilt"
              value={tilt}
              min={0}
              max={45}
              step={1}
              suffix="°"
              onChange={setTilt}
              hint={
                tiltHint != null
                  ? `Optimal for this latitude ≈ ${tiltHint}°.`
                  : "Optimal tilt ≈ your latitude."
              }
            />
            <Slider
              label="Panel azimuth"
              value={azimuth}
              min={90}
              max={270}
              step={5}
              suffix="°"
              onChange={setAzimuth}
              hint="180° = due south = maximum generation in India."
            />
            <Slider
              label="Module density"
              value={moduleDensity}
              min={0.12}
              max={0.22}
              step={0.01}
              suffix=" kWp/m²"
              onChange={setModuleDensity}
              hint="Installed capacity per usable m² (panel efficiency + spacing)."
            />
            <Slider
              label="Performance ratio"
              value={performanceRatio}
              min={65}
              max={85}
              step={1}
              suffix="%"
              onChange={setPerformanceRatio}
              hint="System losses: heat, soiling, inverter, wiring. 75% is typical in India."
            />
          </div>

          {/* Finance assumptions */}
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
              <BadgeIndianRupee className="h-3.5 w-3.5" />
              Finance
            </p>

            <Slider
              label="System cost"
              value={costPerKwp}
              min={40000}
              max={70000}
              step={1000}
              suffix=" ₹/kWp"
              onChange={setCostPerKwp}
              hint="Gross installed cost before subsidy. ₹50–60k/kWp is typical for residential."
            />
            <Slider
              label="Electricity tariff"
              value={tariff}
              min={4}
              max={14}
              step={0.5}
              suffix=" ₹/kWh"
              onChange={setTariff}
              hint="Your retail slab rate. Solar offsets units at this price (net metering)."
            />
            <Slider
              label="State subsidy"
              value={stateSubsidy}
              min={0}
              max={50000}
              step={5000}
              suffix=" ₹"
              onChange={setStateSubsidy}
              hint="Optional top-up over PM Surya Ghar (varies by state; 0 if none)."
            />
            <Slider
              label="Tariff escalation"
              value={tariffEscalation}
              min={0}
              max={8}
              step={0.5}
              suffix="%/yr"
              onChange={setTariffEscalation}
              hint="Grid tariffs historically rise ~3%/yr, which grows your savings."
            />
            <Slider
              label="Panel degradation"
              value={degradation}
              min={0}
              max={1.5}
              step={0.1}
              suffix="%/yr"
              onChange={setDegradation}
              hint="Output loss per year. Modern panels warranty ~0.5–0.7%/yr."
            />
          </div>

          <p className="text-[11px] leading-relaxed text-slate-600">
            Generation uses NASA POWER climatology with a Liu-Jordan isotropic
            transposition (E = kWp × POA × PR). Finance applies the PM Surya Ghar
            subsidy with 1:1 net metering, tariff escalation, and degradation over{" "}
            {HORIZON_YEARS} years. Informational estimate, not a professional quote.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
  hint: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm text-slate-300">{label}</label>
        <span className="font-mono text-sm text-amber-400">
          {value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber-500"
      />
      <p className="mt-1 text-[11px] leading-snug text-slate-500">{hint}</p>
    </div>
  );
}
