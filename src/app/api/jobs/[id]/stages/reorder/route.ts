import prisma from "@/lib/prisma";
import { getJobOrThrow } from "@/lib/api/helpers";
import { requireAdminUser } from "@/lib/auth/server";
import {
  ApiError,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import { parseReorderStagesBody } from "@/lib/api/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdminUser();
    const { id: jobId } = await context.params;
    await getJobOrThrow(jobId);

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const { stageIds } = parseReorderStagesBody(body);

    const stages = await prisma.stage.findMany({
      where: { jobId },
      select: { id: true },
      orderBy: { orderInPipeline: "asc" },
    });

    if (stages.length !== stageIds.length) {
      throw new ApiError(400, "stageIds must include every stage for this workflow");
    }

    const existingIds = new Set(stages.map((stage) => stage.id));
    for (const stageId of stageIds) {
      if (!existingIds.has(stageId)) {
        throw new ApiError(400, "stageIds contains an invalid stage for this workflow");
      }
    }

    await prisma.$transaction(
      stageIds.map((stageId, index) =>
        prisma.stage.update({
          where: { id: stageId },
          data: { orderInPipeline: index },
        }),
      ),
    );

    const updatedStages = await prisma.stage.findMany({
      where: { jobId },
      orderBy: { orderInPipeline: "asc" },
      include: {
        _count: {
          select: { candidates: true },
        },
      },
    });

    return jsonResponse(updatedStages);
  } catch (error) {
    if (error instanceof ApiError) return errorResponse(error);
    return errorResponse(error);
  }
}
