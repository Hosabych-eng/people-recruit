import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api/response";
import {
  assertCandidateAccess,
  assertJobAccess,
} from "@/lib/auth/access";
import type { SessionUser } from "@/lib/auth-session";

export async function getJobOrThrow(id: string, user?: SessionUser) {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) {
    throw new ApiError(404, "Job not found");
  }
  if (user) {
    assertJobAccess(job, user);
  }
  return job;
}

export async function getCandidateOrThrow(id: string, user?: SessionUser) {
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: { stage: true, job: true },
  });
  if (!candidate) {
    throw new ApiError(404, "Candidate not found");
  }
  if (user) {
    assertCandidateAccess(candidate, user);
  }
  return candidate;
}

export async function validateStageBelongsToJob(
  stageId: string,
  jobId: string,
) {
  const stage = await prisma.stage.findFirst({
    where: { id: stageId, jobId },
  });
  if (!stage) {
    throw new ApiError(
      400,
      "Stage not found or does not belong to the specified job",
    );
  }
  return stage;
}
