"use client";

import type { RecruitingAnalyticsResponse } from "@/types";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const PIE_CHART_HEIGHT = 220;

type PieTooltipProps = {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    payload?: { percentage?: number; color?: string };
  }>;
};

function PieTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{item.name}</p>
      <p className="text-muted">
        {item.value} ({item.payload?.percentage ?? 0}%)
      </p>
    </div>
  );
}

type LegendItem = {
  id: string;
  label: string;
  color: string;
  value: string;
};

function PieChartPanel({
  data,
  nameKey,
  emptyMessage,
  legendItems,
}: {
  data: Array<Record<string, string | number>>;
  nameKey: string;
  emptyMessage: string;
  legendItems: LegendItem[];
}) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted"
        style={{ height: PIE_CHART_HEIGHT }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div
        className="w-full shrink-0"
        style={{ height: PIE_CHART_HEIGHT }}
      >
        <ResponsiveContainer width="100%" height={PIE_CHART_HEIGHT}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey={nameKey}
              innerRadius={52}
              outerRadius={78}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell
                  key={String(entry.id ?? entry.key ?? entry.source ?? index)}
                  fill={String(entry.color)}
                />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="space-y-2 border-t border-border pt-4">
        {legendItems.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span className="flex min-w-0 items-center gap-2 text-muted">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="shrink-0 font-medium text-foreground">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type SourcesPieChartProps = {
  data: RecruitingAnalyticsResponse["sourcesBreakdown"];
};

export function SourcesPieChart({ data }: SourcesPieChartProps) {
  return (
    <PieChartPanel
      data={data.map((item) => ({
        ...item,
        id: item.source,
        count: item.count,
      }))}
      nameKey="label"
      emptyMessage="Немає даних"
      legendItems={data.map((item) => ({
        id: item.source,
        label: item.label,
        color: item.color,
        value: `${item.percentage}%`,
      }))}
    />
  );
}

type EmailsPieChartProps = {
  emails: RecruitingAnalyticsResponse["emails"];
};

const EMAIL_COLORS = {
  sent: "#2563eb",
  received: "#10b981",
};

export function EmailsPieChart({ emails }: EmailsPieChartProps) {
  const total = emails.sent + emails.received;
  const rows = [
    {
      key: "sent",
      label: "Надіслано",
      count: emails.sent,
      percentage: total === 0 ? 0 : Math.round((emails.sent / total) * 1000) / 10,
      color: EMAIL_COLORS.sent,
    },
    {
      key: "received",
      label: "Отримано",
      count: emails.received,
      percentage:
        total === 0 ? 0 : Math.round((emails.received / total) * 1000) / 10,
      color: EMAIL_COLORS.received,
    },
  ];

  if (total === 0) {
    return (
      <PieChartPanel
        data={[]}
        nameKey="label"
        emptyMessage="Немає email-активності"
        legendItems={[]}
      />
    );
  }

  return (
    <PieChartPanel
      data={rows}
      nameKey="label"
      emptyMessage="Немає email-активності"
      legendItems={rows.map((item) => ({
        id: item.key,
        label: item.label,
        color: item.color,
        value: `${item.count} (${item.percentage}%)`,
      }))}
    />
  );
}

export function AnalyticsSidebarCharts({
  sourcesBreakdown,
  emails,
}: {
  sourcesBreakdown: RecruitingAnalyticsResponse["sourcesBreakdown"];
  emails: RecruitingAnalyticsResponse["emails"];
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-1">
      <section className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Джерела</h2>
        <p className="mt-1 text-sm text-muted">Частка всіх кандидатів</p>
        <div className="mt-4 min-w-0 flex-1">
          <SourcesPieChart data={sourcesBreakdown} />
        </div>
      </section>

      <section className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Електронні листи</h2>
        <p className="mt-1 text-sm text-muted">Надіслано vs отримано</p>
        <div className="mt-4 min-w-0 flex-1">
          <EmailsPieChart emails={emails} />
        </div>
      </section>
    </div>
  );
}
