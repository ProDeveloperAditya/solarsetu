"use client";

import {
  Sun,
  Sparkles,
  PencilRuler,
  ArrowDown,
  Ruler,
  CloudSun,
  BadgeIndianRupee,
  ShieldCheck,
  FlaskConical,
  KeyRound,
  Code2,
} from "lucide-react";

const GITHUB_URL = "https://github.com/ProDeveloperAditya/solarsetu";

/** Inline GitHub mark — lucide removed brand icons in recent versions. */
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-[1100] flex h-14 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-5 backdrop-blur">
      <a href="#top" className="flex items-center gap-2">
        <Sun className="h-5 w-5 text-amber-400" />
        <span className="text-base font-semibold tracking-tight">
          Solar<span className="text-amber-400">Setu</span>
        </span>
      </a>
      <nav className="flex items-center gap-2 text-sm">
        <a
          href="#how-it-works"
          className="hidden rounded-md px-3 py-1.5 text-slate-400 transition hover:text-slate-100 sm:block"
        >
          How it works
        </a>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-slate-400 transition hover:text-slate-100"
        >
          <GithubIcon className="h-4 w-4" />
          <span className="hidden sm:inline">GitHub</span>
        </a>
        <a
          href="#estimate"
          className="rounded-lg bg-amber-500 px-3.5 py-1.5 font-semibold text-slate-950 transition hover:bg-amber-400"
        >
          Estimate my roof
        </a>
      </nav>
    </header>
  );
}

export function Hero({ onDemo }: { onDemo: () => void }) {
  return (
    <section
      id="top"
      className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center overflow-hidden px-5 py-16 text-center"
    >
      <div className="bg-grid absolute inset-0" aria-hidden="true" />
      <div className="hero-glow absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-3xl">
        <div className="animate-floaty mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 ring-1 ring-amber-500/40">
          <Sun className="h-8 w-8 text-amber-400" />
        </div>

        <h1 className="animate-fade-up text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Your roof is worth
          <br />
          <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent">
            more than you think.
          </span>
        </h1>

        <p
          className="animate-fade-up mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg"
          style={{ animationDelay: "120ms" }}
        >
          Trace your rooftop on a satellite map. SolarSetu models your solar
          generation from <span className="text-slate-200">NASA irradiance data</span>,
          applies the <span className="text-slate-200">PM Surya Ghar subsidy</span>,
          and tells you exactly when the system pays for itself.
        </p>

        <div
          className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ animationDelay: "240ms" }}
        >
          <button
            onClick={onDemo}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-amber-500/25 transition hover:-translate-y-0.5 hover:bg-amber-400 sm:w-auto"
          >
            <Sparkles className="h-5 w-5" />
            Instant demo — see a Delhi roof
          </button>
          <a
            href="#estimate"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-3.5 text-base font-medium text-slate-200 transition hover:-translate-y-0.5 hover:border-slate-500 sm:w-auto"
          >
            <PencilRuler className="h-5 w-5 text-slate-400" />
            Draw my own roof
          </a>
        </div>

        <div
          className="animate-fade-up mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-slate-500 sm:text-sm"
          style={{ animationDelay: "360ms" }}
        >
          <span>
            <span className="font-mono font-semibold text-slate-300">₹78,000</span>{" "}
            max central subsidy
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-slate-700 sm:block" />
          <span>
            <span className="font-mono font-semibold text-slate-300">25-year</span>{" "}
            financial model
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-slate-700 sm:block" />
          <span>
            <span className="font-mono font-semibold text-slate-300">NASA POWER</span>{" "}
            climatology
          </span>
        </div>
      </div>

      <a
        href="#estimate"
        aria-label="Scroll to the estimator"
        className="absolute bottom-6 z-10 text-slate-600 transition hover:text-slate-300"
      >
        <ArrowDown className="h-5 w-5 animate-bounce" />
      </a>
    </section>
  );
}

const STEPS = [
  {
    icon: Ruler,
    title: "Geometry",
    body: "Trace your roof; turf.js computes geodesic area and orientation. The geometry layer is source-agnostic — the Google Solar API or a CV roof-detector can slot in without touching the models downstream.",
  },
  {
    icon: CloudSun,
    title: "Physics",
    body: "NASA POWER climatology for your exact coordinates, transposed to the panel plane with a Liu-Jordan isotropic model, then E = kWp × POA × PR with explicit derating. No city-level averages, no magic numbers.",
  },
  {
    icon: BadgeIndianRupee,
    title: "Money",
    body: "The tiered PM Surya Ghar subsidy (₹30k/kW → ₹78k cap), 1:1 net metering, tariff escalation, and panel degradation — compounded over 25 years into payback, ROI, and CO₂ avoided.",
  },
];

const BADGES = [
  { icon: ShieldCheck, label: "Validated vs Delhi benchmark" },
  { icon: FlaskConical, label: "19 unit tests on the models" },
  { icon: KeyRound, label: "Zero API keys" },
  { icon: Code2, label: "Open source" },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-slate-800/80 px-5 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          Not a lookup table — a{" "}
          <span className="text-amber-400">real model</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-slate-400">
          Most solar calculators multiply your bill by a magic number. SolarSetu
          models the physics and the policy, and every assumption is an
          adjustable slider you can audit.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-slate-700 hover:bg-slate-900"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30">
                <step.icon className="h-5 w-5 text-amber-400" />
              </div>
              <p className="mb-1 font-mono text-xs text-slate-600">0{i + 1}</p>
              <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {BADGES.map((badge) => (
            <span
              key={badge.label}
              className="flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-3.5 py-1.5 text-xs text-slate-400"
            >
              <badge.icon className="h-3.5 w-3.5 text-emerald-400" />
              {badge.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 px-5 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Sun className="h-4 w-4 text-amber-400" />
          <span className="font-semibold text-slate-300">
            Solar<span className="text-amber-400">Setu</span>
          </span>
        </div>
        <p>
          Built by{" "}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-300 underline-offset-2 transition hover:text-amber-400 hover:underline"
          >
            ProDeveloperAditya
          </a>{" "}
          · Data: NASA POWER · Imagery: Esri · Geocoding: OpenStreetMap
        </p>
        <p className="max-w-lg leading-relaxed text-slate-600">
          SolarSetu produces informational estimates from climatological
          averages and public subsidy rules — not a professional site survey or
          financial advice. Actual results vary by site, vendor, DISCOM, and
          current policy.
        </p>
      </div>
    </footer>
  );
}
