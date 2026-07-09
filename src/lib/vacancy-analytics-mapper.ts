import type { ApplicationSource } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api/response";
import { recruiterCandidateFilter } from "@/lib/auth/access";
import type { SessionUser } from "@/lib/auth-session";
import { buildRecruitingAnalytics } from "@/lib/recruiting-analytics";
import { salaryToUsd } from "@/lib/salary-usd";
import type { VacancyAnalyticsResponse } from "@/types";

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function buildCompensationSummary(salariesUsd: number[]) {
  if (salariesUsd.length === 0) {
    return { avgUsd: 0, minUsd: 0, maxUsd: 0 };
  }

  const minUsd = Math.min(...salariesUsd);
  const maxUsd = Math.max(...salariesUsd);
  const avgUsd = Math.round(
    salariesUsd.reduce((sum, value) => sum + value, 0) / salariesUsd.length,
  );

  return { avgUsd, minUsd, maxUsd };
}

type CandidateAnalyticsRow = {
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

/**
 * Maps Prisma vacancy data into the Recharts-friendly payload.
 * Swap mock data for this function in the reports API when wiring live DB stats.
 */
export function mapVacancyAnalyticsToCharts(
  job: { id: string; title: string },
  candidates: CandidateAnalyticsRow[],
  funnelStageNames: string[],
  interviewCount: number,
  from: Date,
  to: Date,
): VacancyAnalyticsResponse {
  const analytics = buildRecruitingAnalytics(candidates, from, to, {
    funnelStageNames,
    interviewCount,
  });

  const salariesUsd = candidates
    .filter((candidate) => candidate.expectedSalary != null)
    .map((candidate) =>
      salaryToUsd(candidate.expectedSalary as number, candidate.salaryCurrency),
    );

  const scores = candidates
    .map((candidate) => candidate.score)
    .filter((score): score is number => score != null);

  return {
    job,
    period: analytics.period,
    summary: {
      ...analytics.summary,
      ratingsCount: scores.length,
    },
    candidatesBySource: analytics.candidatesBySource,
    funnel: analytics.funnel,
    compensation: analytics.compensation,
    compensationSummary: buildCompensationSummary(salariesUsd),
    sourcesBreakdown: analytics.sourcesBreakdown,
    emails: analytics.emails,
    sourceLegend: analytics.sourceLegend,
  };
}

export async function fetchVacancyAnalytics(
  jobId: string,
  fromInput: Date,
  toInput: Date,
  user?: SessionUser,
): Promise<VacancyAnalyticsResponse> {
  const from = startOfDay(fromInput);
  const to = endOfDay(toInput);

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      title: true,
      stages: {
        orderBy: { orderInPipeline: "asc" },
        select: { name: true },
      },
    },
  });

  if (!job) {
    throw new ApiError(404, "Vacancy not found");
  }

  const candidateWhere = user
    ? { jobId, ...recruiterCandidateFilter(user) }
    : { jobId };

  const [candidates, interviewCount] = await Promise.all([
    prisma.candidate.findMany({
      where: candidateWhere,
      select: {
        id: true,
        name: true,
        createdAt: true,
        applicationSource: true,
        score: true,
        emailsSent: true,
        emailsReceived: true,
        expectedSalary: true,
        salaryCurrency: true,
        stage: {
          select: {
            name: true,
            orderInPipeline: true,
          },
        },
      },
    }),
    prisma.interview.count({
      where: { candidate: candidateWhere },
    }),
  ]);

  return mapVacancyAnalyticsToCharts(
    { id: job.id, title: job.title },
    candidates,
    job.stages.map((stage) => stage.name),
    interviewCount,
    from,
    to,
  );
}
