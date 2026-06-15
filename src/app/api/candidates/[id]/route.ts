import prisma from "@/lib/prisma";
import {
  getCandidateOrThrow,
  validateStageBelongsToJob,
} from "@/lib/api/helpers";
import {
  ApiError,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import { parseUpdateCandidateBody } from "@/lib/api/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const candidate = await getCandidateOrThrow(id);
    return jsonResponse(candidate);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existing = await getCandidateOrThrow(id);

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const updates = parseUpdateCandidateBody(body);

    if (updates.stageId) {
      await validateStageBelongsToJob(updates.stageId, existing.jobId);
    }

    const candidate = await prisma.candidate.update({
      where: { id },
      data: updates,
      include: {
        stage: true,
        job: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    return jsonResponse(candidate);
  } catch (error) {
    if (error instanceof ApiError) return errorResponse(error);
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await getCandidateOrThrow(id);

    await prisma.candidate.delete({ where: { id } });

    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
