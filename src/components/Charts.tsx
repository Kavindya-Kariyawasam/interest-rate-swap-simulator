"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
} from "recharts";
import { formatMoney, formatRate } from "@/lib/format";
import type { CurrencyCode } from "@/lib/form";
import type { SwapResult } from "@/lib/swap";

interface ChartsProps {
  result: SwapResult;
  fixedRatePct: number;
  currency: CurrencyCode;
}

const GREEN = "#15803d";
const RED = "#b91c1c";
const BLUE = "#1d4ed8";
const AMBER = "#b45309";
const GRID = "#e2e8f0";
const AXIS = "#475569";

function compactMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function ChartCard({ title, caption, children }: { title: string; caption: string; children: ReactNode }) {
  return (
    <figure className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <figcaption className="mb-2">
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        <span className="block text-xs text-slate-600">{caption}</span>
      </figcaption>
      <div className="h-64">{children}</div>
    </figure>
  );
}

function SignedBar(props: BarShapeProps) {
  const { x, y, width, height, value } = props;
  const amount = Array.isArray(value) ? value[1] : value;
  return <Rectangle x={x} y={y} width={width} height={height} fill={amount < 0 ? RED : GREEN} />;
}

export function Charts({ result, fixedRatePct, currency }: ChartsProps) {
  const data = result.rows.map((r) => ({
    period: r.index,
    floating: r.floatingRatePct,
    net: r.net,
    cumulative: r.cumulativeNet,
  }));
  const margin = { top: 8, right: 12, bottom: 4, left: 4 };
  const xAxis = (
    <XAxis
      dataKey="period"
      tick={{ fill: AXIS, fontSize: 12 }}
      label={{ value: "Period", position: "insideBottom", offset: -2, fill: AXIS, fontSize: 12 }}
      height={36}
    />
  );
  const moneyTooltip = (value: unknown) => formatMoney(Number(value), currency, true);
  const periodLabel = (label: unknown) => `Period ${String(label)}`;

  return (
    <section aria-label="Charts" className="grid gap-3 lg:grid-cols-2">
      <ChartCard title="Fixed vs floating rate" caption="Floating rate per period against the fixed rate K">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={margin}>
            <CartesianGrid stroke={GRID} />
            {xAxis}
            <YAxis
              tick={{ fill: AXIS, fontSize: 12 }}
              tickFormatter={(v: number) => `${v}%`}
              domain={[0, "auto"]}
              width={48}
            />
            <Tooltip formatter={(v) => formatRate(Number(v))} labelFormatter={periodLabel} />
            <Legend verticalAlign="top" height={24} />
            <ReferenceLine
              y={fixedRatePct}
              stroke={AMBER}
              strokeDasharray="6 4"
              strokeWidth={2}
              label={{ value: `Fixed ${formatRate(fixedRatePct)}`, position: "insideTopRight", fill: AMBER, fontSize: 12 }}
            />
            <Line isAnimationActive={false} name="Floating rate" dataKey="floating" stroke={BLUE} strokeWidth={2.5} dot={data.length <= 40} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Net settlement per period" caption="Green: you receive. Red: you pay.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={margin}>
            <CartesianGrid stroke={GRID} />
            {xAxis}
            <YAxis tick={{ fill: AXIS, fontSize: 12 }} tickFormatter={compactMoney} width={56} />
            <Tooltip formatter={moneyTooltip} labelFormatter={periodLabel} />
            <ReferenceLine y={0} stroke={AXIS} />
            <Bar isAnimationActive={false} name="Net settlement" dataKey="net" shape={SignedBar} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="lg:col-span-2">
        <ChartCard title="Cumulative net settlement" caption="Running total of net settlements from your position">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={margin}>
              <CartesianGrid stroke={GRID} />
              {xAxis}
              <YAxis tick={{ fill: AXIS, fontSize: 12 }} tickFormatter={compactMoney} width={56} />
              <Tooltip formatter={moneyTooltip} labelFormatter={periodLabel} />
              <ReferenceLine y={0} stroke={AXIS} />
              <Area isAnimationActive={false} name="Cumulative net" dataKey="cumulative" stroke={BLUE} strokeWidth={2.5} fill={BLUE} fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </section>
  );
}
