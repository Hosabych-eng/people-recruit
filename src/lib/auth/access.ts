import type { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api/response";
import type { SessionUser } from "@/lib/auth-session";

export function recruiterCandidateFilter(
  user: SessionUser,
): Prisma.CandidateWhereInput {
  if (user.role === "ADMIN") return {};
  return { recruiterId: user.id };
}

export function recruiterJobFilter(user: SessionUser): Prisma.JobWhereInput {
  if (user.role === "ADMIN") return {};
  return { recruiterId: user.id };
}

export function assertCandidateAccess(
  candidate: { recruiterId: string | null },
  user: SessionUser,
) {
  if (user.role === "ADMIN") return;
  if (candidate.recruiterId !== user.id) {
    throw new ApiError(403, "Немає доступу до цього кандидата");
  }
}

export function assertJobAccess(
  job: { recruiterId: string | null },
  user: SessionUser,
) {
  if (user.role === "ADMIN") return;
  if (job.recruiterId !== user.id) {
    throw new ApiError(403, "Немає доступу до цієї вакансії");
  }
}
