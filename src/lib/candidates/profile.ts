import prisma from "@/lib/prisma";
import {
  candidateProfileSelect,
  type CandidateProfileRecord,
} from "@/lib/candidates/profile-select";
import { syncCandidateApplication } from "@/lib/settings/defaults";
import { assertCandidateAccess } from "@/lib/auth/access";
import type { SessionUser } from "@/lib/auth-session";
import { notFound } from "next/navigation";

export async function getCandidateProfile(
  id: string,
  user?: SessionUser,
): Promise<CandidateProfileRecord> {
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    select: candidateProfileSelect,
  });

  if (!candidate) notFound();
  if (user) assertCandidateAccess(candidate, user);

  if (candidate.applications.length === 0) {
    await syncCandidateApplication(candidate.id, candidate.jobId, candidate.stageId);
    const applications = await prisma.candidateApplication.findMany({
      where: { candidateId: id },
      select: {
        id: true,
        candidateId: true,
        jobId: true,
        stageId: true,
        createdAt: true,
        job: { select: { id: true, title: true, status: true } },
        stage: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return { ...candidate, applications };
  }

  return candidate;
}
