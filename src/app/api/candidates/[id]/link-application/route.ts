import { getCandidateOrThrow, validateStageBelongsToJob } from "@/lib/api/helpers";
import { ApiError, errorResponse, jsonResponse, parseJsonBody } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import { syncCandidateApplication } from "@/lib/settings/defaults";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getCandidateOrThrow(id, session);

    const body = await parseJsonBody<{
      jobId?: string;
      stageId?: string;
      updateProfile?: Record<string, unknown>;
    }>(request);

    const jobId = body.jobId?.trim();
    const stageId = body.stageId?.trim();
    if (!jobId || !stageId) {
      throw new ApiError(400, "jobId and stageId are required");
    }

    await validateStageBelongsToJob(stageId, jobId);

    if (body.updateProfile && Object.keys(body.updateProfile).length > 0) {
      await prisma.candidate.update({
        where: { id },
        data: body.updateProfile as {
          name?: string;
          email?: string | null;
          phone?: string | null;
          position?: string | null;
        },
      });
    }

    const application = await syncCandidateApplication(id, jobId, stageId);
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        stage: true,
        job: { select: { id: true, title: true, status: true } },
        rejectionReason: true,
      },
    });

    return jsonResponse({ candidate, application });
  } catch (error) {
    return errorResponse(error);
  }
}
