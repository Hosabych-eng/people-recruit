import type { ApplicationSource } from "@prisma/client";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/constants";
import { statusFromStageName } from "@/lib/candidate-status";
import { APPLICATION_SOURCES, SOURCE_META } from "@/lib/application-sources";
import { buildCompensationHistogram, salaryToUsd } from "@/lib/salary-usd";

type CandidateRow = {
  id: string;
  name: string;
  createdAt: Date;
  applicationSource: ApplicationSource;
  score: number | null;
  emailsSent: number;
  emailsReceived: number;
  expectedSalary: number | null;
  salaryCurrency: string | null;
  stage: { name: string; orderInPipeline: number };
};

export type RecruitingAnalyticsResult = {
  period: { from: string; to: string };
  summary: {
    activeCandidates: number;
    rejected: number;
    interviews: number;
    offersSent: number;
    offersAccepted: number;
    averageScore: number;
  };
  candidatesBySource: Array<Record<string, number | string> & { date: string }>;
  funnel: Array<{
    stage: string;
    count: number;
    efficiency: number;
  }>;
  compensation: {
    curve: Array<{ salaryUsd: number; count: number }>;
    scatter: Array<{ salaryUsd: number; density: number }>;
  };
  sourcesBreakdown: Array<{
    source: ApplicationSource;
    label: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  emails: {
    sent: number;
    received: number;
  };
  sourceLegend: Array<{
    key: ApplicationSource;
    label: string;
    color: string;
  }>;
};

function formatDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function eachDayInRange(from: Date, to: Date) {
  const days: string[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    days.push(formatDayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function isOfferedStage(stageName: string) {
  const normalized = stageName.toLowerCase();
  return normalized.includes("offer") && !normalized.includes("hired");
}

function isHiredStage(stageName: string) {
  return stageName.toLowerCase().includes("hired");
}

function isInterviewStage(stageName: string) {
  const status = statusFromStageName(stageName);
  return status === "interviewing";
}

export function buildRecruitingAnalytics(
  candidates: CandidateRow[],
  from: Date,
  to: Date,
  options?: {
    funnelStageNames?: string[];
    interviewCount?: number;
  },
): RecruitingAnalyticsResult {
  const inPeriod = candidates.filter(
    (candidate) => candidate.createdAt >= from && candidate.createdAt <= to,
  );

  let rejected = 0;
  let interviews = 0;
  let offersSent = 0;
  let offersAccepted = 0;
  let activeCandidates = 0;
  const scores: number[] = [];
  let emailsSent = 0;
  let emailsReceived = 0;

  const sourceTotals = new Map<ApplicationSource, number>();
  for (const source of APPLICATION_SOURCES) {
    sourceTotals.set(source, 0);
  }

  for (const candidate of candidates) {
    const stageName = candidate.stage.name;
    const status = statusFromStageName(stageName);

    if (status === "rejected") rejected += 1;
    else activeCandidates += 1;

    if (isInterviewStage(stageName)) interviews += 1;
    if (isOfferedStage(stageName)) offersSent += 1;
    if (isHiredStage(stageName)) offersAccepted += 1;

    if (candidate.score != null) scores.push(candidate.score);

    emailsSent += candidate.emailsSent;
    emailsReceived += candidate.emailsReceived;

    sourceTotals.set(
      candidate.applicationSource,
      (sourceTotals.get(candidate.applicationSource) ?? 0) + 1,
    );
  }

  if (options?.interviewCount != null) {
    interviews = options.interviewCount;
  }

  const newInPeriod = inPeriod;
  const dayMap = new Map<string, Record<ApplicationSource, number>>();

  for (const day of eachDayInRange(from, to)) {
    const entry = {} as Record<ApplicationSource, number>;
    for (const source of APPLICATION_SOURCES) entry[source] = 0;
    dayMap.set(day, entry);
  }

  for (const candidate of newInPeriod) {
    const day = formatDayKey(candidate.createdAt);
    const entry = dayMap.get(day);
    if (!entry) continue;
    entry[candidate.applicationSource] += 1;
  }

  const candidatesBySource = [...dayMap.entries()].map(([date, counts]) => ({
    date,
    ...counts,
  }));

  const funnelStageNames =
    options?.funnelStageNames?.length
      ? options.funnelStageNames
      : DEFAULT_PIPELINE_STAGES.map((stage) => stage.name);
  const funnelCounts = funnelStageNames.map((stageName) => ({
    stage: stageName,
    count: candidates.filter(
      (candidate) =>
        candidate.stage.name.toLowerCase() === stageName.toLowerCase(),
    ).length,
  }));

  const topCount = Math.max(funnelCounts[0]?.count ?? 0, 1);
  const funnel = funnelCounts.map((item) => ({
    ...item,
    efficiency: Math.round((item.count / topCount) * 1000) / 10,
  }));

  const salariesUsd = candidates
    .filter((candidate) => candidate.expectedSalary != null)
    .map((candidate) =>
      salaryToUsd(candidate.expectedSalary as number, candidate.salaryCurrency),
    );

  const compensation = buildCompensationHistogram(salariesUsd);

  const totalSourceCount = [...sourceTotals.values()].reduce(
    (sum, count) => sum + count,
    0,
  );

  const sourcesBreakdown = APPLICATION_SOURCES.map((source) => {
    const count = sourceTotals.get(source) ?? 0;
    return {
      source,
      label: SOURCE_META[source].label,
      color: SOURCE_META[source].color,
      count,
      percentage:
        totalSourceCount === 0
          ? 0
          : Math.round((count / totalSourceCount) * 1000) / 10,
    };
  }).filter((item) => item.count > 0);

  const averageScore =
    scores.length === 0
      ? 0
      : Math.round(
          (scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10,
        ) / 10;

  return {
    period: {
      from: from.toISOString(),
      to: to.toISOString(),
    },
    summary: {
      activeCandidates,
      rejected,
      interviews,
      offersSent,
      offersAccepted,
      averageScore,
    },
    candidatesBySource,
    funnel,
    compensation,
    sourcesBreakdown,
    emails: {
      sent: emailsSent,
      received: emailsReceived,
    },
    sourceLegend: APPLICATION_SOURCES.map((source) => ({
      key: source,
      label: SOURCE_META[source].label,
      color: SOURCE_META[source].color,
    })),
  };
}
