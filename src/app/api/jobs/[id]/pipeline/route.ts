import prisma from "@/lib/prisma";
import { getJobOrThrow } from "@/lib/api/helpers";
import { errorResponse, jsonResponse } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import { recruiterCandidateFilter } from "@/lib/auth/access";
import { syncCandidateApplication } from "@/lib/settings/defaults";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Lean Kanban card fields — no resumeText/coverLetter/notes/emails/documents bodies. */
const pipelineCandidateSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  resumeLink: true,
  avatarUrl: true,
  position: true,
  englishLevel: true,
  chineseLevel: true,
  expectedSalary: true,
  salaryCurrency: true,
  applicationSource: true,
  score: true,
  skills: true,
  evaluationAverage: true,
  emailsSent: true,
  emailsReceived: true,
  isNew: true,
  location: true,
  telegram: true,
  stageId: true,
  jobId: true,
  recruiterId: true,
  rejectionReasonId: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { candidateNotes: true, documents: true },
  },
  tagAssignments: {
    select: {
      tag: { select: { id: true, name: true, color: true } },
    },
  },
  rejectionReason: { select: { id: true, name: true } },
  testAssignments: {
    where: { submittedAt: null, uploadExpiresAt: { not: null } },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { uploadExpiresAt: true, status: true },
  },
} as const;

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    const candidateScope = recruiterCandidateFilter(session);

    const [, legacyCandidates] = await Promise.all([
      getJobOrThrow(id, session),
      prisma.candidate.findMany({
        where: { jobId: id, ...candidateScope },
        select: { id: true, stageId: true },
      }),
    ]);

    await Promise.all(
      legacyCandidates.map((row) => syncCandidateApplication(row.id, id, row.stageId)),
    );

    const [job, applications] = await Promise.all([
      prisma.job.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          responsibilities: true,
          requiredSkills: true,
          weOffer: true,
          location: true,
          employmentType: true,
          status: true,
          headcount: true,
          openedAt: true,
          createdAt: true,
          updatedAt: true,
          stages: {
            orderBy: { orderInPipeline: "asc" },
            select: {
              id: true,
              name: true,
              orderInPipeline: true,
              automationEnabled: true,
              jobId: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }),
      prisma.candidateApplication.findMany({
        where: { jobId: id, candidate: candidateScope },
        select: {
          stageId: true,
          candidate: { select: pipelineCandidateSelect },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!job) return jsonResponse(null);

    const pipeline = {
      ...job,
      stages: job.stages.map((stage) => ({
        ...stage,
        candidates: applications
          .filter((row) => row.stageId === stage.id)
          .map((row) => ({
            ...row.candidate,
            stageId: row.stageId,
            tags: row.candidate.tagAssignments.map((tagRow) => tagRow.tag),
            skills: row.candidate.skills,
            evaluationAverage: row.candidate.evaluationAverage,
            testAssignmentDeadline: row.candidate.testAssignments[0]?.uploadExpiresAt ?? null,
            rejectionReason: row.candidate.rejectionReason,
          })),
      })),
    };

    return jsonResponse(pipeline);
  } catch (error) {
    return errorResponse(error);
  }
}
