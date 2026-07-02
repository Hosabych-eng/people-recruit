"use client";

import type { CompensationSummary } from "@/types";

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

type CompensationSummaryCardsProps = {
  summary: CompensationSummary;
};

export function CompensationSummaryCards({ summary }: CompensationSummaryCardsProps) {
  const items = [
    { key: "avg", label: "сер. базова компенсація", value: summary.avgUsd },
    { key: "min", label: "мін. базова компенсація", value: summary.minUsd },
    { key: "max", label: "макс. базова компенсація", value: summary.maxUsd },
  ] as const;

  const hasData = summary.avgUsd > 0 || summary.minUsd > 0 || summary.maxUsd > 0;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.key}
          className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm"
        >
          <p className="text-sm text-muted">{item.label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {hasData ? formatUsd(item.value) : "—"}
          </p>
        </article>
      ))}
    </div>
  );
}
