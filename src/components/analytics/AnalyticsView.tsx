"use client";

import { useCallback, useEffect, useState } from "react";
import type { AnalyticsCategory, AnalyticsResponse } from "@/types";
import { AnalyticsDailyChart } from "@/components/analytics/AnalyticsDailyChart";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api/client";
import { exportAnalyticsToXlsx } from "@/lib/analytics-export";

type PeriodPreset = "7d" | "30d" | "90d" | "custom";

const metricStyles: Record<
  AnalyticsCategory["key"],
  { accent: string; bar: string }
> = {
  recruitingIn: {
    accent: "border-t-sky-500",
    bar: "bg-sky-500",
  },
  recruitingOut: {
    accent: "border-t-amber-500",
    bar: "bg-amber-500",
  },
  onboarding: {
    accent: "border-t-emerald-500",
    bar: "bg-emerald-500",
  },
  offboarding: {
    accent: "border-t-rose-500",
    bar: "bg-rose-500",
  },
  total: {
    accent: "border-t-slate-500",
    bar: "bg-slate-500",
  },
};

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

function formatEventType(type: AnalyticsResponse["recentEvents"][number]["type"]) {
  switch (type) {
    case "RECRUITING_IN":
      return "Нова заявка";
    case "RECRUITING_OUT":
      return "Закрита заявка";
    case "ONBOARDING":
      return "Онбординг";
    case "OFFBOARDING":
      return "Офбординг";
  }
}

export function AnalyticsView() {
  const initialRange = getPresetRange("30d");
  const [preset, setPreset] = useState<PeriodPreset>("30d");
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async (from: string, to: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.analytics.get(from, to);
      setData(response);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Не вдалося завантажити аналітику");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics(fromDate, toDate);
  }, [fromDate, toDate, loadAnalytics]);

  const handlePresetChange = (nextPreset: Exclude<PeriodPreset, "custom">) => {
    const range = getPresetRange(nextPreset);
    setPreset(nextPreset);
    setFromDate(range.from);
    setToDate(range.to);
  };

  const handleExport = () => {
    if (!data) return;
    exportAnalyticsToXlsx(data);
  };

  const categories = data?.categories.filter((item) => item.key !== "total") ?? [];

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-card px-6 py-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Аналітика кадрів
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Рух персоналу
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Відстежуйте надходження та вихід кандидатів, онбординг і офбординг
              за обраний період.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {data && (
              <p className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted ring-1 ring-border">
                {formatDisplayDate(data.period.from)} –{" "}
                {formatDisplayDate(data.period.to)}
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              disabled={!data || isLoading}
            >
              Експорт в Excel
            </Button>
          </div>
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
              Власний період
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
                  className="block rounded-lg border border-border bg-background px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted">До</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="block rounded-lg border border-border bg-background px-3 py-2"
                />
              </label>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAnalytics(fromDate, toDate)}
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
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {categories.map((category) => {
                const styles = metricStyles[category.key];
                const value = data.summary[category.key];

                return (
                  <article
                    key={category.key}
                    className={`rounded-xl border border-border border-t-4 ${styles.accent} bg-card p-5 shadow-sm`}
                  >
                    <p className="text-sm font-medium text-muted">
                      {category.label}
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-foreground">
                      {value}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {category.description}
                    </p>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      Щоденна активність
                    </h2>
                    <p className="text-sm text-muted">
                      Динаміка за категоріями руху персоналу
                    </p>
                  </div>
                  <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted ring-1 ring-border">
                    {data.timeline.length} днів з активністю
                  </span>
                </div>

                <AnalyticsDailyChart timeline={data.timeline} />
              </section>

              <section className="flex min-h-[460px] flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="shrink-0">
                  <h2 className="text-base font-semibold text-foreground">
                    Останні події
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Найновіші зміни за обраний період
                  </p>
                </div>

                <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
                  {data.recentEvents.length === 0 ? (
                    <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-dashed border-border px-4 text-center text-sm text-muted">
                      Поки що немає даних.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.recentEvents.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-lg border border-border bg-background px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {event.personName}
                              </p>
                              <p className="mt-1 truncate text-xs text-muted">
                                {event.jobTitle ?? "Посада не вказана"}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-card px-2 py-1 text-[11px] font-medium text-muted ring-1 ring-border">
                              {formatEventType(event.type)}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-muted">
                            {formatDisplayDate(event.occurredAt)}
                            {event.note ? ` · ${event.note}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-base font-semibold text-foreground">
                Легенда категорій
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {categories.map((category) => (
                  <div key={category.key} className="flex items-center gap-3">
                    <span
                      className={`h-3 w-3 rounded-full ${metricStyles[category.key].bar}`}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {category.label}
                      </p>
                      <p className="text-xs text-muted">{category.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
