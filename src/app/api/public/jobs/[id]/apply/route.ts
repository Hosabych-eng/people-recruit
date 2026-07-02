import prisma from "@/lib/prisma";
import { getJobOrThrow } from "@/lib/api/helpers";
import {
  ApiError,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import { optionalString, requireString } from "@/lib/api/validation";
import { logWorkforceEvent } from "@/lib/workforce-events";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parsePublicApplyBody(body: Record<string, unknown>) {
  return {
    name: requireString(body.name, "name"),
    email: requireString(body.email, "email"),
    phone: optionalString(body.phone),
    resumeLink: optionalString(body.resumeLink),
  };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const job = await getJobOrThrow(id);

    if (job.status !== "OPEN") {
      throw new ApiError(400, "This job is not accepting applications");
    }

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const input = parsePublicApplyBody(body);

    const firstStage = await prisma.stage.findFirst({
      where: { jobId: job.id },
      orderBy: { orderInPipeline: "asc" },
    });

    if (!firstStage) {
      throw new ApiError(400, "Job pipeline is not configured");
    }

    const candidate = await prisma.candidate.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        resumeLink: input.resumeLink,
        jobId: job.id,
        stageId: firstStage.id,
        applicationSource: "CAREER_SITE",
        isNew: true,
      },
    });

    await logWorkforceEvent({
      type: "RECRUITING_IN",
      personName: candidate.name,
      jobTitle: job.title,
      candidateId: candidate.id,
      jobId: job.id,
      note: "Public application",
    });

    return jsonResponse({ success: true, candidateId: candidate.id }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
