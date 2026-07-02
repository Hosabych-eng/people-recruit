"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { VacancyAnalyticsResponse } from "@/types";
import { CandidatesBySourceChart } from "@/components/analytics/CandidatesBySourceChart";
import { CompensationDistributionChart } from "@/components/analytics/CompensationDistributionChart";
import { CompensationSummaryCards } from "@/components/analytics/CompensationSummaryCards";
import { RecruitmentFunnelChart } from "@/components/analytics/RecruitmentFunnelChart";
import {
  AnalyticsSidebarCharts,
} from "@/components/analytics/RecruitingSidebarCharts";
import { VacancySummaryCard } from "@/components/analytics/VacancySummaryCard";
import { VacancyPipelineHeader } from "@/components/pipeline/VacancyPipelineHeader";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName } from "@/components/ui/formStyles";
import { api } from "@/lib/api/client";
import type { JobWithPipeline } from "@/types";

type PeriodPreset = "7d" | "30d" | "90d";

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

function getPresetRange(preset: PeriodPreset) {
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

type VacancyReportsDashboardProps = {
  jobId: string;
  initialMock?: boolean;
};

export function VacancyReportsDashboard({
  jobId,
  initialMock = true,
}: VacancyReportsDashboardProps) {
  const initialRange = getPresetRange("30d");
  const [preset, setPreset] = useState<PeriodPreset>("30d");
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [useMock, setUseMock] = useState(initialMock);
  const [pipeline, setPipeline] = useState<JobWithPipeline | null>(null);
  const [data, setData] = useState<VacancyAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.jobs
      .pipeline(jobId)
      .then(setPipeline)
      .catch(() => setPipeline(null));
  }, [jobId]);

  const loadReports = useCallback(
    async (from: string, to: string, mock: boolean) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.vacancyReports.get(jobId, from, to, mock);
        setData(response);
      } catch (err) {
        setData(null);
        setError(err instanceof Error ? err.message : "Не вдалося завантажити звіт");
      } finally {
        setIsLoading(false);
      }
    },
    [jobId],
  );

  useEffect(() => {
    loadReports(fromDate, toDate, useMock);
  }, [fromDate, toDate, useMock, loadReports]);

  const handlePresetChange = (nextPreset: PeriodPreset) => {
    const range = getPresetRange(nextPreset);
    setPreset(nextPreset);
    setFromDate(range.from);
    setToDate(range.to);
  };

  return (
    <div className="flex min-h-full flex-col">
      {pipeline && (
        <VacancyPipelineHeader
          pipeline={pipeline}
          activeTab="reports"
          onTabChange={(tab) => {
            if (tab === "cycle") {
              window.location.href = `/recruiting?job=${pipeline.id}`;
            }
          }}
          onShare={() => {
            const url = `${window.location.origin}/vacancies/${pipeline.id}/reports`;
            void navigator.clipboard.writeText(url);
          }}
          onEdit={() => {
            window.location.href = `/pipelines/${pipeline.id}`;
          }}
        />
      )}

      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Звіти вакансії
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {data?.job.title ?? pipeline?.title ?? "Аналітика"}
            </h1>
            {data && (
              <p className="mt-1 text-sm text-muted">
                {formatDisplayDate(data.period.from)} – {formatDisplayDate(data.period.to)}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/recruiting?job=${jobId}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              ← До воронки
            </Link>
            <Button
              size="sm"
              variant={useMock ? "primary" : "outline"}
              onClick={() => setUseMock((current) => !current)}
            >
              {useMock ? "Демо-дані" : "Живі дані"}
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-border bg-card p-4 shadow-sm">
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
          <div className="ml-auto flex items-end gap-3">
            <label className="space-y-1 text-sm">
              <span className="text-muted">Від</span>
              <input
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setPreset("30d");
                  setFromDate(event.target.value);
                }}
                className={`${formControlClassName} py-1.5`}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted">До</span>
              <input
                type="date"
                value={toDate}
                onChange={(event) => {
                  setPreset("30d");
                  setToDate(event.target.value);
                }}
                className={`${formControlClassName} py-1.5`}
              />
            </label>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadReports(fromDate, toDate, useMock)}
            >
              Повторити
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex min-h-[420px] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted">
              <Spinner className="h-8 w-8" />
              <p className="text-sm">Завантаження звіту…</p>
            </div>
          </div>
        )}

        {!isLoading && data && (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h2 className="text-base font-semibold text-foreground">
                  Нові кандидати за джерелом
                </h2>
                <div className="mt-5">
                  <CandidatesBySourceChart
                    data={data.candidatesBySource}
                    legend={data.sourceLegend}
                  />
                </div>
              </section>

              <VacancySummaryCard summary={data.summary} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h2 className="text-base font-semibold text-foreground">
                  Воронка вакансії
                </h2>
                <div className="mt-5">
                  <RecruitmentFunnelChart funnel={data.funnel} />
                </div>
              </section>

              <AnalyticsSidebarCharts
                sourcesBreakdown={data.sourcesBreakdown}
                emails={data.emails}
              />
            </div>

            <section className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-base font-semibold text-foreground">
                Компенсація
              </h2>
              <CompensationSummaryCards summary={data.compensationSummary} />
              <div>
                <h3 className="text-sm font-medium text-foreground">
                  Розподіл базової компенсації
                </h3>
                <div className="mt-4">
                  <CompensationDistributionChart compensation={data.compensation} />
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
