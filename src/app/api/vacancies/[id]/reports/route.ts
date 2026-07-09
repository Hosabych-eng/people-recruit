import { ApiError, errorResponse, jsonResponse } from "@/lib/api/response";
import { optionalQueryParam } from "@/lib/api/validation";
import { fetchVacancyAnalytics } from "@/lib/vacancy-analytics-mapper";
import { getVacancyAnalyticsMock } from "@/lib/vacancy-analytics-mock";
import { getJobOrThrow } from "@/lib/api/helpers";
import { requireSessionUser } from "@/lib/auth/server";
import prisma from "@/lib/prisma";

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

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getJobOrThrow(id, session);
    const { searchParams } = new URL(request.url);
    const from = parseDateParam(searchParams.get("from"), "from");
    const to = parseDateParam(searchParams.get("to"), "to");
    const mock = optionalQueryParam(searchParams, "mock") === "1";

    if (from > to) {
      throw new ApiError(400, '"from" must be before or equal to "to"');
    }

    if (mock) {
      const job = await prisma.job.findUnique({
        where: { id },
        select: { id: true, title: true },
      });

      return jsonResponse(
        getVacancyAnalyticsMock(id, job?.title ?? "Trainee/Junior QA (Ukraine)"),
      );
    }

    const data = await fetchVacancyAnalytics(id, from, to, session);
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
