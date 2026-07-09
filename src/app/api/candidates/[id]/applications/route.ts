import prisma from "@/lib/prisma";
import { getCandidateOrThrow, validateStageBelongsToJob } from "@/lib/api/helpers";
import {
  ApiError,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import { requireString } from "@/lib/api/validation";
import { requireSessionUser } from "@/lib/auth/server";
import { resolveRejectionFieldsForStageChange } from "@/lib/rejection-reasons";
import { isRejectedStageName } from "@/lib/pipeline-utils";
import { syncCandidateApplication } from "@/lib/settings/defaults";
import { maybeTriggerTestAssignmentAutomation } from "@/lib/test-assignment-automation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getCandidateOrThrow(id, session);

    const applications = await prisma.candidateApplication.findMany({
      where: { candidateId: id },
      include: {
        job: { select: { id: true, title: true, status: true } },
        stage: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse(applications);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getCandidateOrThrow(id, session);

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const jobId = requireString(body.jobId, "jobId");
    const stageId = requireString(body.stageId, "stageId");

    await validateStageBelongsToJob(stageId, jobId);

    const application = await syncCandidateApplication(id, jobId, stageId);
    const full = await prisma.candidateApplication.findUnique({
      where: { id: application.id },
      include: {
        job: { select: { id: true, title: true, status: true } },
        stage: { select: { id: true, name: true } },
      },
    });

    return jsonResponse(full, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    const candidate = await getCandidateOrThrow(id, session);

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const applicationId = requireString(body.applicationId, "applicationId");
    const stageId = requireString(body.stageId, "stageId");

    const application = await prisma.candidateApplication.findFirst({
      where: { id: applicationId, candidateId: id },
      include: { stage: true },
    });
    if (!application) throw new ApiError(404, "Application not found");

    const targetStage = await validateStageBelongsToJob(stageId, application.jobId);

    const updated = await prisma.candidateApplication.update({
      where: { id: applicationId },
      data: { stageId },
      include: {
        job: { select: { id: true, title: true, status: true } },
        stage: { select: { id: true, name: true } },
      },
    });

    if (candidate.jobId === application.jobId) {
      const rejectionFields = await resolveRejectionFieldsForStageChange({
        body,
        targetStageName: targetStage.name,
        currentRejectionReasonId: candidate.rejectionReasonId,
      });

      await prisma.candidate.update({
        where: { id },
        data: { stageId, ...rejectionFields },
      });

      await maybeTriggerTestAssignmentAutomation({
        candidateId: id,
        stageId,
        actorUserId: session.id,
        actorName: session.name,
        actorEmail: session.email,
      }).catch((error) => {
        console.error("[test-assignment] automation failed", error);
      });
    } else if (isRejectedStageName(targetStage.name)) {
      const rejectionFields = await resolveRejectionFieldsForStageChange({
        body,
        targetStageName: targetStage.name,
        currentRejectionReasonId: candidate.rejectionReasonId,
      });

      await prisma.candidate.update({
        where: { id },
        data: rejectionFields,
      });
    }

    return jsonResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
