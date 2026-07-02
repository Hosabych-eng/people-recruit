import type { ApplicationSource } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  getJobOrThrow,
  validateStageBelongsToJob,
} from "@/lib/api/helpers";
import {
  ApiError,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import { parseImportCandidateBody } from "@/lib/api/validation";
import { requireSessionUser } from "@/lib/auth/server";
import {
  findDuplicateCandidate,
  getCandidateDuplicateHistory,
} from "@/lib/candidates/duplicate-check";
import { parseCandidateImportInput } from "@/lib/candidates/import-parser";
import { logWorkforceEvent } from "@/lib/workforce-events";

function mergeImportFields(
  input: ReturnType<typeof parseImportCandidateBody>,
  parsed: ReturnType<typeof parseCandidateImportInput>,
) {
  const email = (input.email ?? parsed.email)?.trim() || undefined;

  return {
    name: input.name ?? parsed.name,
    email,
    phone: input.phone ?? parsed.phone,
    resumeLink: input.resumeLink ?? parsed.resumeLink,
    applicationSource: (input.applicationSource ??
      parsed.applicationSource ??
      "MANUAL") as ApplicationSource,
  };
}

export async function POST(request: Request) {
  try {
    await requireSessionUser();

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const input = parseImportCandidateBody(body);
    const parsed = input.rawInput ? parseCandidateImportInput(input.rawInput) : {};
    const merged = mergeImportFields(input, parsed);

    if (!merged.email && !merged.resumeLink) {
      throw new ApiError(
        400,
        "Email or profile URL is required to import a candidate",
      );
    }

    const duplicate = await findDuplicateCandidate({
      email: merged.email,
      resumeLink: merged.resumeLink,
    });

    if (duplicate) {
      const history = await getCandidateDuplicateHistory(duplicate.id);
      return jsonResponse({
        isDuplicate: true,
        candidate: duplicate,
        history,
      });
    }

    if (!merged.name) {
      throw new ApiError(400, "Candidate name is required");
    }

    if (!merged.resumeLink) {
      throw new ApiError(
        400,
        "Profile URL is required when email is not provided",
      );
    }

    const job = await getJobOrThrow(input.jobId);
    await validateStageBelongsToJob(input.stageId, input.jobId);

    const candidate = await prisma.candidate.create({
      data: {
        name: merged.name,
        email: merged.email ?? null,
        phone: merged.phone,
        resumeLink: merged.resumeLink,
        applicationSource: merged.applicationSource,
        job: {
          connect: { id: input.jobId },
        },
        stage: {
          connect: { id: input.stageId },
        },
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
      note: "Imported candidate",
    });

    return jsonResponse(
      {
        isDuplicate: false,
        candidate,
      },
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
