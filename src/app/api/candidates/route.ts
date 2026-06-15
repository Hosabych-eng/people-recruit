import prisma from "@/lib/prisma";
import {
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import {
  optionalQueryParam,
  parseCreateCandidateBody,
} from "@/lib/api/validation";
import {
  getJobOrThrow,
  validateStageBelongsToJob,
} from "@/lib/api/helpers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = optionalQueryParam(searchParams, "jobId");

    const candidates = await prisma.candidate.findMany({
      where: jobId ? { jobId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        stage: true,
        job: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    return jsonResponse(candidates);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const input = parseCreateCandidateBody(body);

    await getJobOrThrow(input.jobId);
    await validateStageBelongsToJob(input.stageId, input.jobId);

    const candidate = await prisma.candidate.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        resumeLink: input.resumeLink,
        jobId: input.jobId,
        stageId: input.stageId,
      },
      include: {
        stage: true,
        job: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    return jsonResponse(candidate, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
