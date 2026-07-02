import prisma from "@/lib/prisma";
import {
  ApiError,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import { parseUpdateStageBody } from "@/lib/api/validation";
import { requireAdminUser } from "@/lib/auth/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdminUser();
    const { id } = await context.params;

    const existing = await prisma.stage.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, "Stage not found");
    }

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const updates = parseUpdateStageBody(body);

    const stage = await prisma.stage.update({
      where: { id },
      data: updates,
      include: {
        _count: {
          select: { candidates: true },
        },
      },
    });

    return jsonResponse(stage);
  } catch (error) {
    if (error instanceof ApiError) return errorResponse(error);
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireAdminUser();
    const { id } = await context.params;

    const existing = await prisma.stage.findUnique({
      where: { id },
      include: {
        _count: {
          select: { candidates: true },
        },
      },
    });

    if (!existing) {
      throw new ApiError(404, "Stage not found");
    }

    if (existing._count.candidates > 0) {
      throw new ApiError(
        400,
        "Cannot delete a stage that still has candidates assigned",
      );
    }

    const remainingCount = await prisma.stage.count({
      where: { jobId: existing.jobId },
    });

    if (remainingCount <= 1) {
      throw new ApiError(400, "A workflow must keep at least one stage");
    }

    await prisma.$transaction(async (tx) => {
      await tx.stage.delete({ where: { id } });

      const remaining = await tx.stage.findMany({
        where: { jobId: existing.jobId },
        orderBy: { orderInPipeline: "asc" },
      });

      await Promise.all(
        remaining.map((stage, index) =>
          tx.stage.update({
            where: { id: stage.id },
            data: { orderInPipeline: index },
          }),
        ),
      );
    });

    return jsonResponse({ success: true });
  } catch (error) {
    if (error instanceof ApiError) return errorResponse(error);
    return errorResponse(error);
  }
}
