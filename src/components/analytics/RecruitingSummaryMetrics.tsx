"use client";

import type { RecruitingAnalyticsSummary } from "@/types";

const METRICS: {
  key: keyof RecruitingAnalyticsSummary;
  label: string;
  accent: string;
}[] = [
  { key: "activeCandidates", label: "Активні кандидати", accent: "border-t-sky-500" },
  { key: "rejected", label: "Відмови", accent: "border-t-rose-500" },
  { key: "interviews", label: "Інтерв'ю", accent: "border-t-violet-500" },
  { key: "offersSent", label: "Надіслані офери", accent: "border-t-amber-500" },
  { key: "offersAccepted", label: "Прийняті офери", accent: "border-t-emerald-500" },
];

type RecruitingSummaryMetricsProps = {
  summary: RecruitingAnalyticsSummary;
};

export function RecruitingSummaryMetrics({ summary }: RecruitingSummaryMetricsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[repeat(5,minmax(0,1fr))_minmax(180px,0.8fr)]">
      {METRICS.map((metric) => (
        <article
          key={metric.key}
          className={`rounded-xl border border-border border-t-4 ${metric.accent} bg-card p-4 shadow-sm`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {metric.label}
          </p>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            {summary[metric.key]}
          </p>
        </article>
      ))}

      <article className="rounded-xl border border-border border-t-4 border-t-primary bg-gradient-to-br from-primary/5 to-card p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Середня оцінка
        </p>
        <p className="mt-2 text-3xl font-semibold text-foreground">
          {summary.averageScore}%
        </p>
      </article>
    </div>
  );
}
