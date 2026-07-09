"use client";

import type { AnalyticsTimelinePoint } from "@/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_COLORS = {
  recruitingIn: "#0ea5e9",
  recruitingOut: "#f59e0b",
  onboarding: "#10b981",
  offboarding: "#f43f5e",
} as const;

const SERIES = [
  { key: "recruitingIn" as const, label: "Нові заявки", color: CHART_COLORS.recruitingIn },
  { key: "recruitingOut" as const, label: "Закриті заявки", color: CHART_COLORS.recruitingOut },
  { key: "onboarding" as const, label: "Онбординг", color: CHART_COLORS.onboarding },
  { key: "offboarding" as const, label: "Офбординг", color: CHART_COLORS.offboarding },
];

function formatAxisDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatTooltipDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

type ChartTooltipProps = {
  active?: boolean;
  payload?: Array<{
    color: string;
    name: string;
    value: number;
  }>;
  label?: string;
};

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length || !label) return null;

  const total = payload.reduce((sum, item) => sum + (item.value ?? 0), 0);

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{formatTooltipDate(label)}</p>
      <div className="mt-2 space-y-1">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-muted">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.name}
            </span>
            <span className="font-medium text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 border-t border-border pt-2 text-xs text-muted">
        Total: {total}
      </p>
    </div>
  );
}

type AnalyticsDailyChartProps = {
  timeline: AnalyticsTimelinePoint[];
};

export function AnalyticsDailyChart({ timeline }: AnalyticsDailyChartProps) {
  if (timeline.length === 0) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-lg border border-dashed border-border px-4 text-center text-sm text-muted">
        No workforce events recorded for this period.
      </div>
    );
  }

  const chartData = timeline.map((point) => ({
    ...point,
    label: formatAxisDate(point.date),
  }));

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatAxisDate}
            tick={{ fill: "#64748b", fontSize: 12 }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#64748b", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "rgba(241, 245, 249, 0.6)" }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          />
          {SERIES.map((series, index) => (
            <Bar
              key={series.key}
              dataKey={series.key}
              name={series.label}
              stackId="daily"
              fill={series.color}
              radius={index === SERIES.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              maxBarSize={48}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
