"use client";

import type { RecruitingAnalyticsResponse } from "@/types";
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

function formatAxisDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
};

function SourceTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length || !label) return null;

  const total = payload.reduce((sum, item) => sum + (item.value ?? 0), 0);
  if (total === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{formatAxisDate(label)}</p>
      <div className="mt-2 space-y-1">
        {payload
          .filter((item) => item.value > 0)
          .map((item) => (
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
    </div>
  );
}

type CandidatesBySourceChartProps = {
  data: RecruitingAnalyticsResponse["candidatesBySource"];
  legend: RecruitingAnalyticsResponse["sourceLegend"];
};

export function CandidatesBySourceChart({
  data,
  legend,
}: CandidatesBySourceChartProps) {
  const hasData = data.some((point) =>
    legend.some((source) => Number(point[source.key] ?? 0) > 0),
  );

  if (!hasData) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted">
        Немає нових кандидатів за обраний період.
      </div>
    );
  }

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatAxisDate}
            tick={{ fill: "#64748b", fontSize: 12 }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#64748b", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip content={<SourceTooltip />} cursor={{ fill: "rgba(241,245,249,0.6)" }} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
          />
          {legend.map((source, index) => (
            <Bar
              key={source.key}
              dataKey={source.key}
              name={source.label}
              stackId="sources"
              fill={source.color}
              radius={index === legend.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              maxBarSize={40}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
