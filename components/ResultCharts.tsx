"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FinanceResult } from "@/lib/finance";
import type { ProductionResult } from "@/lib/solar";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const tooltipStyle = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
} as const;

function inrCompact(n: number): string {
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(0)}k`;
  return `₹${n.toFixed(0)}`;
}

export function MonthlyGenerationChart({
  production,
}: {
  production: ProductionResult;
}) {
  const data = production.monthlyEnergyKwh.map((kwh, i) => ({
    month: MONTH_LABELS[i],
    kwh: Math.round(kwh),
  }));

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
        Monthly generation (kWh)
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "#f59e0b11" }}
            formatter={(v) => [`${v} kWh`, "Generation"]}
          />
          <Bar dataKey="kwh" fill="#f59e0b" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SavingsChart({ finance }: { finance: FinanceResult }) {
  const data = finance.schedule.map((row) => ({
    year: row.year,
    net: Math.round(row.netPosition),
  }));

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
        Cumulative net position (25 yr)
      </p>
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fill: "#64748b", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            ticks={[1, 5, 10, 15, 20, 25]}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v) => inrCompact(Number(v))}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v) => [inrCompact(Number(v)), "Net position"]}
            labelFormatter={(y) => `Year ${y}`}
          />
          {/* Break-even line */}
          <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4" />
          {finance.paybackYears != null && (
            <ReferenceLine
              x={Math.round(finance.paybackYears)}
              stroke="#10b981"
              strokeDasharray="4 4"
              label={{ value: "break-even", fill: "#10b981", fontSize: 10, position: "top" }}
            />
          )}
          <Line
            type="monotone"
            dataKey="net"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
