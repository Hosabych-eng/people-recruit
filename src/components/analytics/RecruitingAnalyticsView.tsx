"use client";

import { useCallback, useEffect, useState } from "react";
import type { JobWithCounts, RecruitingAnalyticsResponse } from "@/types";
import { CandidatesBySourceChart } from "@/components/analytics/CandidatesBySourceChart";
import { CompensationDistributionChart } from "@/components/analytics/CompensationDistributionChart";
import { RecruitmentFunnelChart } from "@/components/analytics/RecruitmentFunnelChart";
import { RecruitingSummaryMetrics } from "@/components/analytics/RecruitingSummaryMetrics";
import { TimeToHireDashboard } from "@/components/analytics/TimeToHireDashboard";
import {
  AnalyticsSidebarCharts,
} from "@/components/analytics/RecruitingSidebarCharts";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName } from "@/components/ui/formStyles";
import { api } from "@/lib/api/client";
import { isAnalyticsEnabled } from "@/lib/feature-flags";

type PeriodPreset = "7d" | "30d" | "90d" | "custom";

function formatInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getPresetRange(preset: Exclude<PeriodPreset, "custom">) {
  const to = new Date();
  const from = new Date();

  if (preset === "7d") from.setDate(to.getDate() - 6);
  if (preset === "30d") from.setDate(to.getDate() - 29);
  if (preset === "90d") from.setDate(to.getDate() - 89);

  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  return {
    from: formatInputDate(from),
    to: formatInputDate(to),
  };
}

export function RecruitingAnalyticsView() {
  const initialRange = getPresetRange("30d");
  const [preset, setPreset] = useState<PeriodPreset>("30d");
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [jobId, setJobId] = useState<string>("");
  const [jobs, setJobs] = useState<JobWithCounts[]>([]);
  const [data, setData] = useState<RecruitingAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.jobs
      .list()
      .then(setJobs)
      .catch(() => setJobs([]));
  }, []);

  const loadAnalytics = useCallback(
    async (from: string, to: string, selectedJobId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.recruitingAnalytics.get(
          from,
          to,
          selectedJobId || undefined,
        );
        setData(response);
      } catch (err) {
        setData(null);
        setError(err instanceof Error ? err.message : "Не вдалося завантажити звіт");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadAnalytics(fromDate, toDate, jobId);
  }, [fromDate, toDate, jobId, loadAnalytics]);

  const handlePresetChange = (nextPreset: Exclude<PeriodPreset, "custom">) => {
    const range = getPresetRange(nextPreset);
    setPreset(nextPreset);
    setFromDate(range.from);
    setToDate(range.to);
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-card px-6 py-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Recruitment tracking
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Analytics &amp; Reports
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Pipeline health, sourcing performance, funnel conversion, and
              compensation insights.
            </p>
          </div>

          {data && (
            <p className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted ring-1 ring-border">
              {formatDisplayDate(data.period.from)} – {formatDisplayDate(data.period.to)}
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-6">
        <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {(["7d", "30d", "90d"] as const).map((item) => (
              <Button
                key={item}
                size="sm"
                variant={preset === item ? "primary" : "outline"}
                onClick={() => handlePresetChange(item)}
              >
                {item === "7d" ? "7 днів" : item === "30d" ? "30 днів" : "90 днів"}
              </Button>
            ))}
            <Button
              size="sm"
              variant={preset === "custom" ? "primary" : "outline"}
              onClick={() => setPreset("custom")}
            >
              Свій період
            </Button>
          </div>

          {preset === "custom" && (
            <div className="flex flex-wrap items-end gap-3">
              <label className="space-y-1 text-sm">
                <span className="text-muted">Від</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className={`${formControlClassName} py-1.5`}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted">До</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className={`${formControlClassName} py-1.5`}
                />
              </label>
            </div>
          )}

          <label className="ml-auto space-y-1 text-sm">
            <span className="text-muted">Вакансія</span>
            <select
              value={jobId}
              onChange={(event) => setJobId(event.target.value)}
              className={`${formControlClassName} min-w-[220px] py-1.5`}
            >
              <option value="">Усі вакансії</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAnalytics(fromDate, toDate, jobId)}
            >
              Повторити
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex min-h-[360px] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted">
              <Spinner className="h-8 w-8" />
              <p className="text-sm">Завантаження аналітики…</p>
            </div>
          </div>
        )}

        {!isLoading && data && (
          <div className="space-y-6">
            <RecruitingSummaryMetrics summary={data.summary} />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-6">
                <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h2 className="text-base font-semibold text-foreground">
                    New candidates by source
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Daily inflow segmented by application channel
                  </p>
                  <div className="mt-5">
                    <CandidatesBySourceChart
                      data={data.candidatesBySource}
                      legend={data.sourceLegend}
                    />
                  </div>
                </section>

                <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h2 className="text-base font-semibold text-foreground">
                    Recruitment Funnel
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Stage volume and conversion vs. top of funnel
                  </p>
                  <div className="mt-5">
                    <RecruitmentFunnelChart funnel={data.funnel} />
                  </div>
                </section>

                <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h2 className="text-base font-semibold text-foreground">
                    Base Compensation Distribution
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Expected base salaries normalized to USD
                  </p>
                  <div className="mt-5">
                    <CompensationDistributionChart compensation={data.compensation} />
                  </div>
                </section>

                {isAnalyticsEnabled && (
                  <TimeToHireDashboard
                    from={fromDate}
                    to={toDate}
                    jobId={jobId || undefined}
                  />
                )}
              </div>

              <AnalyticsSidebarCharts
                sourcesBreakdown={data.sourcesBreakdown}
                emails={data.emails}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
