"use client";

import { useState } from "react";
import { RoofEstimator } from "./RoofEstimator";
import { Header, Hero, HowItWorks, Footer } from "./Landing";

export function SolarSetuApp() {
  const [demoTick, setDemoTick] = useState(0);

  function handleDemo() {
    setDemoTick((tick) => tick + 1);
    document.getElementById("estimate")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <Hero onDemo={handleDemo} />
        <section
          id="estimate"
          className="scroll-mt-14 border-t border-slate-800/80 lg:h-[calc(100dvh-3.5rem)] lg:min-h-[560px]"
        >
          <RoofEstimator demoTick={demoTick} />
        </section>
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
}
