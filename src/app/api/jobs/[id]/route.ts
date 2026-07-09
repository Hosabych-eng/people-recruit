import prisma from "@/lib/prisma";
import { getJobOrThrow } from "@/lib/api/helpers";
import { requireAdminUser, requireSessionUser } from "@/lib/auth/server";
import {
  ApiError,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import { parseUpdateJobBody } from "@/lib/api/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    const job = await getJobOrThrow(id, session);

    const jobWithCounts = await prisma.job.findUnique({
      where: { id: job.id },
      include: {
        stages: {
          orderBy: { orderInPipeline: "asc" },
          include: {
            _count: {
              select: { candidates: true },
            },
          },
        },
        _count: {
          select: { candidates: true },
        },
      },
    });

    return jsonResponse(jobWithCounts);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdminUser();
    const { id } = await context.params;
    await getJobOrThrow(id);

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const updates = parseUpdateJobBody(body);

    const job = await prisma.job.update({
      where: { id },
      data: updates,
      include: {
        stages: {
          orderBy: { orderInPipeline: "asc" },
        },
      },
    });

    return jsonResponse(job);
  } catch (error) {
    if (error instanceof ApiError) return errorResponse(error);
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireAdminUser();
    const { id } = await context.params;
    await getJobOrThrow(id);

    await prisma.job.delete({ where: { id } });

    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
