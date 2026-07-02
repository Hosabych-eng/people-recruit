import { WorkforceEventType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ApiError, errorResponse, jsonResponse } from "@/lib/api/response";

const EVENT_TYPES = Object.values(WorkforceEventType);

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

function formatDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = startOfDay(parseDateParam(searchParams.get("from"), "from"));
    const to = endOfDay(parseDateParam(searchParams.get("to"), "to"));

    if (from > to) {
      throw new ApiError(400, '"from" must be before or equal to "to"');
    }

    const events = await prisma.workforceEvent.findMany({
      where: {
        occurredAt: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { occurredAt: "desc" },
      select: {
        id: true,
        type: true,
        personName: true,
        jobTitle: true,
        note: true,
        occurredAt: true,
      },
    });

    const summary = {
      recruitingIn: 0,
      recruitingOut: 0,
      onboarding: 0,
      offboarding: 0,
      total: events.length,
    };

    const timelineMap = new Map<
      string,
      {
        date: string;
        recruitingIn: number;
        recruitingOut: number;
        onboarding: number;
        offboarding: number;
      }
    >();

    for (const event of events) {
      switch (event.type) {
        case WorkforceEventType.RECRUITING_IN:
          summary.recruitingIn += 1;
          break;
        case WorkforceEventType.RECRUITING_OUT:
          summary.recruitingOut += 1;
          break;
        case WorkforceEventType.ONBOARDING:
          summary.onboarding += 1;
          break;
        case WorkforceEventType.OFFBOARDING:
          summary.offboarding += 1;
          break;
      }

      const dayKey = formatDayKey(event.occurredAt);
      const dayEntry = timelineMap.get(dayKey) ?? {
        date: dayKey,
        recruitingIn: 0,
        recruitingOut: 0,
        onboarding: 0,
        offboarding: 0,
      };

      switch (event.type) {
        case WorkforceEventType.RECRUITING_IN:
          dayEntry.recruitingIn += 1;
          break;
        case WorkforceEventType.RECRUITING_OUT:
          dayEntry.recruitingOut += 1;
          break;
        case WorkforceEventType.ONBOARDING:
          dayEntry.onboarding += 1;
          break;
        case WorkforceEventType.OFFBOARDING:
          dayEntry.offboarding += 1;
          break;
      }

      timelineMap.set(dayKey, dayEntry);
    }

    const timeline = [...timelineMap.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    return jsonResponse({
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      summary,
      timeline,
      recentEvents: events.slice(0, 12),
      categories: [
        {
          key: "recruitingIn",
          label: "New applications",
          description: "Candidates entered the recruiting pipeline",
          type: WorkforceEventType.RECRUITING_IN,
        },
        {
          key: "recruitingOut",
          label: "Closed applications",
          description: "Rejected, withdrawn, or removed from pipeline",
          type: WorkforceEventType.RECRUITING_OUT,
        },
        {
          key: "onboarding",
          label: "Onboarded",
          description: "People who completed hiring and started onboarding",
          type: WorkforceEventType.ONBOARDING,
        },
        {
          key: "offboarding",
          label: "Offboarded",
          description: "People who left the company in this period",
          type: WorkforceEventType.OFFBOARDING,
        },
      ],
      eventTypes: EVENT_TYPES,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
