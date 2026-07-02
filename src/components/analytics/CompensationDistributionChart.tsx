"use client";

import type { RecruitingAnalyticsResponse } from "@/types";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatSalary(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

type CompensationTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload?: { salaryUsd?: number; count?: number; density?: number };
  }>;
};

function CompensationTooltip({ active, payload }: CompensationTooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  if (point.count != null) {
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
        <p className="font-medium text-foreground">{formatSalary(point.salaryUsd ?? 0)}</p>
        <p className="text-muted">{point.count} candidates</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{formatSalary(point.salaryUsd ?? 0)}</p>
      <p className="text-muted">Expected base salary</p>
    </div>
  );
}

type CompensationDistributionChartProps = {
  compensation: RecruitingAnalyticsResponse["compensation"];
};

export function CompensationDistributionChart({
  compensation,
}: CompensationDistributionChartProps) {
  const chartData = compensation.curve.map((point) => ({
    ...point,
    smooth: point.count,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted">
        Немає даних про компенсацію.
      </div>
    );
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="salaryUsd"
            tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
            tick={{ fill: "#64748b", fontSize: 12 }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#64748b", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={28}
            label={{
              value: "Count",
              angle: -90,
              position: "insideLeft",
              fill: "#94a3b8",
              fontSize: 11,
            }}
          />
          <Tooltip content={<CompensationTooltip />} />
          <Area
            type="monotone"
            dataKey="smooth"
            stroke="#2563eb"
            fill="url(#salaryGradient)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Scatter
            data={compensation.scatter}
            dataKey="density"
            fill="#0f172a"
            opacity={0.45}
          />
          <defs>
            <linearGradient id="salaryGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.03} />
            </linearGradient>
          </defs>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
