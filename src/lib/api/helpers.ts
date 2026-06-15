import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api/response";

export async function getJobOrThrow(id: string) {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) {
    throw new ApiError(404, "Job not found");
  }
  return job;
}

export async function getCandidateOrThrow(id: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: { stage: true, job: true },
  });
  if (!candidate) {
    throw new ApiError(404, "Candidate not found");
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
