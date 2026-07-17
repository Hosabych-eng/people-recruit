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
import { resolveRejectionFieldsForStageChange } from "@/lib/rejection-reasons";
import { assignTalentPoolTags } from "@/lib/candidate-talent-pool";
import { syncCandidateApplication } from "@/lib/settings/defaults";
import { maybeTriggerTestAssignmentAutomation } from "@/lib/test-assignment-automation";
import {
  HIRED_STAGE_NAME,
  logWorkforceEvent,
} from "@/lib/workforce-events";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    const candidate = await getCandidateOrThrow(id, session);
    return jsonResponse(candidate);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    const existing = await getCandidateOrThrow(id, session);

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const updates = parseUpdateCandidateBody(body);
    const talentPoolTagIds = Array.isArray(body.talentPoolTagIds)
      ? body.talentPoolTagIds.filter((id): id is string => typeof id === "string")
      : [];

    let targetStageName: string | null = null;
    const targetJobId = updates.jobId ?? existing.jobId;

    if (updates.jobId) {
      const job = await prisma.job.findUnique({
        where: { id: updates.jobId },
        select: { id: true },
      });
      if (!job) {
        throw new ApiError(400, "jobId must reference an existing vacancy");
      }
    }

    if (updates.stageId) {
      const targetStage = await validateStageBelongsToJob(
        updates.stageId,
        targetJobId,
      );
      targetStageName = targetStage.name;

      const rejectionFields = await resolveRejectionFieldsForStageChange({
        body,
        targetStageName: targetStage.name,
        currentRejectionReasonId: existing.rejectionReasonId,
      });
      Object.assign(updates, rejectionFields);

      await syncCandidateApplication(id, targetJobId, updates.stageId);
    } else if (updates.jobId) {
      await syncCandidateApplication(id, updates.jobId, existing.stageId);
    }

    if (updates.recruiterId) {
      const recruiter = await prisma.user.findFirst({
        where: { id: updates.recruiterId, status: "ACTIVE" },
        select: { id: true },
      });
      if (!recruiter) {
        throw new ApiError(400, "recruiterId must reference an active user");
      }
    }

    const candidate = await prisma.candidate.update({
      where: { id },
      data: updates,
      include: {
        stage: true,
        job: {
          select: { id: true, title: true, status: true },
        },
        rejectionReason: true,
        recruiter: {
          select: { id: true, name: true, email: true, image: true },
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

    if (updates.stageId && existing.stageId !== updates.stageId) {
      await maybeTriggerTestAssignmentAutomation({
        candidateId: id,
        stageId: updates.stageId,
        actorUserId: session.id,
        actorName: session.name,
        actorEmail: session.email,
      }).catch((error) => {
        console.error("[test-assignment] automation failed", error);
      });
    }

    if (talentPoolTagIds.length > 0) {
      await assignTalentPoolTags(id, talentPoolTagIds);
    }

    return jsonResponse(candidate);
  } catch (error) {
    if (error instanceof ApiError) return errorResponse(error);
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getCandidateOrThrow(id, session);

    await prisma.candidate.delete({ where: { id } });

    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
