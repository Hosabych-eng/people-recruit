import prisma from "@/lib/prisma";
import { getJobOrThrow } from "@/lib/api/helpers";
import { requireAdminUser } from "@/lib/auth/server";
import {
  ApiError,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import { parseCreateStageBody, requireQueryParam } from "@/lib/api/validation";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = requireQueryParam(searchParams, "jobId");

    await getJobOrThrow(jobId);

    const stages = await prisma.stage.findMany({
      where: { jobId },
      orderBy: { orderInPipeline: "asc" },
      include: {
        _count: {
          select: { candidates: true },
        },
      },
    });

    return jsonResponse(stages);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const input = parseCreateStageBody(body);

    await getJobOrThrow(input.jobId);

    const maxOrder = await prisma.stage.aggregate({
      where: { jobId: input.jobId },
      _max: { orderInPipeline: true },
    });

    const stage = await prisma.stage.create({
      data: {
        jobId: input.jobId,
        name: input.name,
        orderInPipeline: (maxOrder._max.orderInPipeline ?? -1) + 1,
      },
      include: {
        _count: {
          select: { candidates: true },
        },
      },
    });

    return jsonResponse(stage, 201);
  } catch (error) {
    if (error instanceof ApiError) return errorResponse(error);
    return errorResponse(error);
  }
}
