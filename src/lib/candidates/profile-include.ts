import type { Prisma } from "@prisma/client";

export const candidateProfileInclude = {
  stage: true,
  job: true,
  candidateNotes: {
    orderBy: { createdAt: "desc" as const },
  },
  interviews: {
    orderBy: { scheduledAt: "desc" as const },
  },
  emailMessages: {
    orderBy: { sentAt: "desc" as const },
  },
  testAssignments: {
    include: { template: true },
    orderBy: { createdAt: "desc" as const },
  },
  documents: {
    orderBy: { createdAt: "desc" as const },
  },
} satisfies Prisma.CandidateInclude;
