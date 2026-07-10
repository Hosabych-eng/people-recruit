import prisma from "@/lib/prisma";
import { ApiError, errorResponse, jsonResponse } from "@/lib/api/response";
import { optionalQueryParam } from "@/lib/api/validation";
import { recruiterCandidateFilter } from "@/lib/auth/access";
import { requireSessionUser } from "@/lib/auth/server";
import { buildTimeToHireAnalytics } from "@/lib/time-to-hire-analytics";

function parseDateParam(value: string | null, field: string): Date {
  if (!value) {
    throw new ApiError(400, `Query parameter "${field}" is required`);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `Query parameter "${field}" must be a valid date`);
  }

  return date;
}

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

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const from = startOfDay(parseDateParam(searchParams.get("from"), "from"));
    const to = endOfDay(parseDateParam(searchParams.get("to"), "to"));
    const jobId = optionalQueryParam(searchParams, "jobId");

    if (from > to) {
      throw new ApiError(400, '"from" must be before or equal to "to"');
    }

    const candidates = await prisma.candidate.findMany({
      where: {
        ...recruiterCandidateFilter(session),
        ...(jobId ? { jobId } : {}),
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        stage: {
          select: {
            name: true,
            orderInPipeline: true,
          },
        },
        applications: {
          select: {
            createdAt: true,
            updatedAt: true,
            stage: { select: { name: true } },
          },
        },
        workforceEvents: {
          select: {
            type: true,
            occurredAt: true,
          },
        },
        interviews: {
          select: {
            scheduledAt: true,
          },
        },
      },
    });

    return jsonResponse(buildTimeToHireAnalytics(candidates, from, to));
  } catch (error) {
    return errorResponse(error);
  }
}
