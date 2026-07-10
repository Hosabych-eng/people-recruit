import { statusFromStageName } from "@/lib/candidate-status";

type ApplicationRow = {
  createdAt: Date;
  updatedAt: Date;
  stage: { name: string };
};

type WorkforceRow = {
  type: string;
  occurredAt: Date;
};

export type TimeToHireCandidateRow = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  stage: { name: string; orderInPipeline: number };
  applications: ApplicationRow[];
  workforceEvents: WorkforceRow[];
  interviews: Array<{ scheduledAt: Date }>;
};

export type TimeToHireAnalyticsResult = {
  period: { from: string; to: string };
  disclaimer: string;
  summary: {
    avgTimeToHireDays: number | null;
    medianTimeToHireDays: number | null;
    hiredInPeriod: number;
    activeCandidates: number;
  };
  stageDwell: Array<{
    stage: string;
    orderInPipeline: number;
    candidateCount: number;
    avgDaysInCurrentStage: number;
    avgDaysInPipeline: number;
    avgDaysFromHistory: number | null;
  }>;
  hiresByMonth: Array<{ month: string; count: number }>;
  recentHires: Array<{
    candidateId: string;
    candidateName: string;
    daysToHire: number;
    hiredAt: string;
  }>;
};

function daysBetween(start: Date, end: Date) {
  return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function roundDays(value: number) {
  return Math.round(value * 10) / 10;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return roundDays((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return roundDays(sorted[mid]);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return roundDays(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function isHiredCandidate(row: TimeToHireCandidateRow) {
  const hasOnboarding = row.workforceEvents.some(
    (event) => event.type === "ONBOARDING",
  );
  return hasOnboarding || row.stage.name.toLowerCase().includes("hired");
}

function resolveHireDate(row: TimeToHireCandidateRow) {
  const onboarding = row.workforceEvents
    .filter((event) => event.type === "ONBOARDING")
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())[0];

  return onboarding?.occurredAt ?? row.updatedAt;
}

function lastStageTransitionAt(row: TimeToHireCandidateRow) {
  const timestamps = [
    row.updatedAt.getTime(),
    ...row.applications.map((application) => application.updatedAt.getTime()),
  ];
  return new Date(Math.max(...timestamps));
}

function buildHistoryStageDurations(
  row: TimeToHireCandidateRow,
  now: Date,
): Array<{ stage: string; days: number }> {
  const segments: Array<{ stage: string; days: number }> = [];

  const timeline: Array<{ at: Date; stage?: string }> = [
    {
      at: row.createdAt,
      stage: row.applications[0]?.stage.name ?? row.stage.name,
    },
    ...row.workforceEvents.map((event) => ({
      at: event.occurredAt,
      stage:
        event.type === "ONBOARDING"
          ? "Hired"
          : event.type === "RECRUITING_OUT"
            ? "Rejected"
            : undefined,
    })),
    ...row.applications.map((application) => ({
      at: application.createdAt,
      stage: application.stage.name,
    })),
    ...row.applications
      .filter((application) => application.updatedAt > application.createdAt)
      .map((application) => ({
        at: application.updatedAt,
        stage: application.stage.name,
      })),
  ].sort((left, right) => left.at.getTime() - right.at.getTime());

  for (let index = 0; index < timeline.length; index += 1) {
    const current = timeline[index];
    if (!current.stage) continue;

    const nextAt = timeline[index + 1]?.at ?? now;
    segments.push({
      stage: current.stage,
      days: daysBetween(current.at, nextAt),
    });
  }

  const lastTransition = lastStageTransitionAt(row);
  if (statusFromStageName(row.stage.name) !== "rejected") {
    segments.push({
      stage: row.stage.name,
      days: daysBetween(lastTransition, now),
    });
  }

  return segments;
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

export function buildTimeToHireAnalytics(
  rows: TimeToHireCandidateRow[],
  from: Date,
  to: Date,
  now = new Date(),
): TimeToHireAnalyticsResult {
  const timeToHireValues: number[] = [];
  const recentHires: TimeToHireAnalyticsResult["recentHires"] = [];
  const hiresByMonthMap = new Map<string, number>();
  const stageDwellMap = new Map<
    string,
    {
      orderInPipeline: number;
      dwellDays: number[];
      pipelineDays: number[];
      historyDays: number[];
    }
  >();

  let activeCandidates = 0;

  for (const row of rows) {
    const status = statusFromStageName(row.stage.name);
    if (status !== "rejected") activeCandidates += 1;

    const stageBucket =
      stageDwellMap.get(row.stage.name) ??
      {
        orderInPipeline: row.stage.orderInPipeline,
        dwellDays: [],
        pipelineDays: [],
        historyDays: [],
      };

    stageBucket.dwellDays.push(
      daysBetween(lastStageTransitionAt(row), now),
    );
    stageBucket.pipelineDays.push(daysBetween(row.createdAt, now));

    for (const segment of buildHistoryStageDurations(row, now)) {
      const bucket =
        stageDwellMap.get(segment.stage) ??
        {
          orderInPipeline: row.stage.orderInPipeline,
          dwellDays: [],
          pipelineDays: [],
          historyDays: [],
        };
      bucket.historyDays.push(segment.days);
      stageDwellMap.set(segment.stage, bucket);
    }

    stageDwellMap.set(row.stage.name, stageBucket);

    if (!isHiredCandidate(row)) continue;

    const hiredAt = resolveHireDate(row);
    if (hiredAt < from || hiredAt > to) continue;

    const daysToHire = daysBetween(row.createdAt, hiredAt);
    timeToHireValues.push(daysToHire);
    recentHires.push({
      candidateId: row.id,
      candidateName: row.name,
      daysToHire: roundDays(daysToHire),
      hiredAt: hiredAt.toISOString(),
    });

    const key = monthKey(hiredAt);
    hiresByMonthMap.set(key, (hiresByMonthMap.get(key) ?? 0) + 1);
  }

  recentHires.sort(
    (left, right) =>
      new Date(right.hiredAt).getTime() - new Date(left.hiredAt).getTime(),
  );

  const stageDwell = [...stageDwellMap.entries()]
    .map(([stage, bucket]) => ({
      stage,
      orderInPipeline: bucket.orderInPipeline,
      candidateCount: bucket.dwellDays.length,
      avgDaysInCurrentStage: average(bucket.dwellDays) ?? 0,
      avgDaysInPipeline: average(bucket.pipelineDays) ?? 0,
      avgDaysFromHistory: average(bucket.historyDays),
    }))
    .sort((left, right) => left.orderInPipeline - right.orderInPipeline);

  const hiresByMonth = [...hiresByMonthMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, count]) => ({ month, count }));

  return {
    period: {
      from: from.toISOString(),
      to: to.toISOString(),
    },
    disclaimer:
      "Час у етапі оцінюється з історичних записів (заявки, workforce-події, оновлення етапу). Проміжні переходи між етапами можуть бути наближеними.",
    summary: {
      avgTimeToHireDays: average(timeToHireValues),
      medianTimeToHireDays: median(timeToHireValues),
      hiredInPeriod: timeToHireValues.length,
      activeCandidates,
    },
    stageDwell,
    hiresByMonth,
    recentHires: recentHires.slice(0, 12),
  };
}
