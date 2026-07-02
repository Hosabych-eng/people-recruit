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
import { requireSessionUser } from "@/lib/auth/server";
import {
  HIRED_STAGE_NAME,
  logWorkforceEvent,
} from "@/lib/workforce-events";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireSessionUser();
    const { id } = await context.params;
    const candidate = await getCandidateOrThrow(id);
    return jsonResponse(candidate);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireSessionUser();
    const { id } = await context.params;
    const existing = await getCandidateOrThrow(id);

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const updates = parseUpdateCandidateBody(body);

    let targetStageName: string | null = null;

    if (updates.stageId) {
      const targetStage = await validateStageBelongsToJob(
        updates.stageId,
        existing.jobId,
      );
      targetStageName = targetStage.name;
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

    if (
      updates.stageId &&
      targetStageName === HIRED_STAGE_NAME &&
      existing.stageId !== updates.stageId
    ) {
      await logWorkforceEvent({
        type: "ONBOARDING",
        personName: candidate.name,
        jobTitle: candidate.job.title,
        candidateId: candidate.id,
        jobId: candidate.jobId,
        note: "Moved to Hired stage",
      });
    }

    return jsonResponse(candidate);
  } catch (error) {
    if (error instanceof ApiError) return errorResponse(error);
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireSessionUser();
    const { id } = await context.params;
    await getCandidateOrThrow(id);

    await prisma.candidate.delete({ where: { id } });

    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
