"use client";

import { useCallback, useEffect, useState } from "react";
import type { TimeToHireAnalyticsResponse } from "@/types";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api/client";

type TimeToHireDashboardProps = {
  from: string;
  to: string;
  jobId?: string;
};

function formatDays(value: number | null) {
  if (value == null) return "—";
  return `${value} дн.`;
}

function formatMonth(value: string) {
  const [year, month] = value.split("-");
  return new Intl.DateTimeFormat("uk-UA", {
    month: "short",
    year: "numeric",
  }).format(new Date(Number(year), Number(month) - 1, 1));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function TimeToHireDashboard({ from, to, jobId }: TimeToHireDashboardProps) {
  const [data, setData] = useState<TimeToHireAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.timeToHireAnalytics.get(from, to, jobId);
      setData(response);
    } catch (err) {
      setData(null);
      setError(
        err instanceof Error ? err.message : "Не вдалося завантажити time-to-hire",
      );
    } finally {
      setIsLoading(false);
    }
  }, [from, to, jobId]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex min-h-[200px] items-center justify-center gap-3 text-muted">
          <Spinner className="h-6 w-6" />
          <span className="text-sm">Завантаження time-to-hire…</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <div className="flex items-center justify-between gap-4">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={load}>
            Повторити
          </Button>
        </div>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Time to Hire</h2>
          <p className="mt-1 text-sm text-muted">
            Час у етапі та швидкість найму на основі історичних записів (read-only).
          </p>
        </div>
        <span className="rounded-full bg-background px-3 py-1 text-xs text-muted ring-1 ring-border">
          {data.summary.activeCandidates} активних · {data.summary.hiredInPeriod} найнято
        </span>
      </div>

      <p className="mt-3 rounded-lg bg-background px-3 py-2 text-xs text-muted ring-1 ring-border">
        {data.disclaimer}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Середній time-to-hire"
          value={formatDays(data.summary.avgTimeToHireDays)}
        />
        <MetricCard
          label="Медіана time-to-hire"
          value={formatDays(data.summary.medianTimeToHireDays)}
        />
        <MetricCard
          label="Найнято за період"
          value={String(data.summary.hiredInPeriod)}
        />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2 font-medium">Етап</th>
              <th className="px-3 py-2 font-medium">Кандидатів</th>
              <th className="px-3 py-2 font-medium">Сер. днів у поточному етапі</th>
              <th className="px-3 py-2 font-medium">Сер. днів у воронці</th>
              <th className="px-3 py-2 font-medium">Сер. з історії</th>
            </tr>
          </thead>
          <tbody>
            {data.stageDwell.map((row) => (
              <tr key={row.stage} className="border-b border-border/70">
                <td className="px-3 py-2.5 font-medium text-foreground">{row.stage}</td>
                <td className="px-3 py-2.5 text-muted">{row.candidateCount}</td>
                <td className="px-3 py-2.5 text-muted">
                  {formatDays(row.avgDaysInCurrentStage)}
                </td>
                <td className="px-3 py-2.5 text-muted">
                  {formatDays(row.avgDaysInPipeline)}
                </td>
                <td className="px-3 py-2.5 text-muted">
                  {formatDays(row.avgDaysFromHistory)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.hiresByMonth.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-foreground">Найми по місяцях</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.hiresByMonth.map((item) => (
              <span
                key={item.month}
                className="rounded-full bg-background px-3 py-1 text-xs text-foreground ring-1 ring-border"
              >
                {formatMonth(item.month)} · {item.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.recentHires.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-foreground">Останні найми</h3>
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {data.recentHires.map((hire) => (
              <li
                key={`${hire.candidateId}-${hire.hiredAt}`}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <span className="font-medium text-foreground">{hire.candidateName}</span>
                <span className="text-muted">
                  {formatDays(hire.daysToHire)} · {formatDate(hire.hiredAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
