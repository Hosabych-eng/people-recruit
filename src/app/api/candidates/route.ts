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
import { requireSessionUser } from "@/lib/auth/server";
import {
  findDuplicateCandidate,
  getCandidateDuplicateHistory,
} from "@/lib/candidates/duplicate-check";
import { logWorkforceEvent } from "@/lib/workforce-events";

export async function GET(request: Request) {
  try {
    await requireSessionUser();

    const { searchParams } = new URL(request.url);
    const jobId = optionalQueryParam(searchParams, "jobId");
    const query = optionalQueryParam(searchParams, "q")?.trim();

    const candidates = await prisma.candidate.findMany({
      where: {
        ...(jobId ? { jobId } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
                { resumeLink: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
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
    await requireSessionUser();

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const input = parseCreateCandidateBody(body);

    const duplicate = await findDuplicateCandidate({
      email: input.email,
      resumeLink: input.resumeLink,
    });

    if (duplicate) {
      const history = await getCandidateDuplicateHistory(duplicate.id);
      return jsonResponse({
        isDuplicate: true,
        candidate: duplicate,
        history,
      });
    }

    const job = await getJobOrThrow(input.jobId);
    await validateStageBelongsToJob(input.stageId, input.jobId);

    const candidate = await prisma.candidate.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        resumeLink: input.resumeLink,
        expectedSalary: input.expectedSalary,
        salaryCurrency: input.salaryCurrency,
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

    await logWorkforceEvent({
      type: "RECRUITING_IN",
      personName: candidate.name,
      jobTitle: job.title,
      candidateId: candidate.id,
      jobId: job.id,
    });

    return jsonResponse({ isDuplicate: false, candidate }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
