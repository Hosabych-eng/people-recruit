"use client";

import type { RecruitingAnalyticsSummary } from "@/types";

const METRICS: {
  key: keyof Pick<
    RecruitingAnalyticsSummary,
    "activeCandidates" | "rejected" | "interviews" | "offersSent" | "offersAccepted"
  >;
  label: string;
}[] = [
  { key: "activeCandidates", label: "активні кандидати" },
  { key: "rejected", label: "відхилені кандидати" },
  { key: "interviews", label: "інтерв'ю" },
  { key: "offersSent", label: "пропозицій надіслано" },
  { key: "offersAccepted", label: "пропозицій прийнято" },
];

type VacancySummaryCardProps = {
  summary: RecruitingAnalyticsSummary;
};

function ratingsLabel(count: number) {
  if (count === 0) return "На основі 0 оцінки(-ок)";
  if (count === 1) return "На основі 1 оцінки";
  if (count >= 2 && count <= 4) return `На основі ${count} оцінки`;
  return `На основі ${count} оцінок`;
}

export function VacancySummaryCard({ summary }: VacancySummaryCardProps) {
  const ratingsCount = summary.ratingsCount ?? 0;

  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="text-center">
        <p className="text-sm font-medium text-muted">Середня оцінка</p>
        <p className="mt-2 text-5xl font-semibold tracking-tight text-foreground">
          {summary.averageScore}%
        </p>
        <p className="mt-2 text-sm text-muted">{ratingsLabel(ratingsCount)}</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-1">
        {METRICS.map((metric) => (
          <div key={metric.key} className="text-center sm:text-left">
            <p className="text-2xl font-semibold text-foreground">
              {summary[metric.key]}
            </p>
            <p className="mt-1 text-xs leading-snug text-muted">{metric.label}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
