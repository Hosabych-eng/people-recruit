import prisma from "@/lib/prisma";
import { getJobOrThrow } from "@/lib/api/helpers";
import { errorResponse, jsonResponse } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import { recruiterCandidateFilter } from "@/lib/auth/access";
import { syncCandidateApplication } from "@/lib/settings/defaults";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getJobOrThrow(id, session);

    const candidateScope = recruiterCandidateFilter(session);

    const legacyCandidates = await prisma.candidate.findMany({
      where: { jobId: id, ...candidateScope },
      select: { id: true, stageId: true },
    });

    await Promise.all(
      legacyCandidates.map((row) => syncCandidateApplication(row.id, id, row.stageId)),
    );

    const [job, applications] = await Promise.all([
      prisma.job.findUnique({
        where: { id },
        include: {
          stages: { orderBy: { orderInPipeline: "asc" } },
        },
      }),
      prisma.candidateApplication.findMany({
        where: { jobId: id, candidate: candidateScope },
        include: {
          stage: true,
          candidate: {
            include: {
              _count: {
                select: { candidateNotes: true, documents: true },
              },
              tagAssignments: { include: { tag: true } },
              rejectionReason: true,
              testAssignments: {
                where: { submittedAt: null, uploadExpiresAt: { not: null } },
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { uploadExpiresAt: true, status: true },
              },
              candidateNotes: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { content: true, createdAt: true },
              },
            },
          },
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
            resumeText: row.candidate.resumeText,
            evaluationAverage: row.candidate.evaluationAverage,
            testAssignmentDeadline: row.candidate.testAssignments[0]?.uploadExpiresAt ?? null,
            lastNote: row.candidate.candidateNotes[0] ?? null,
          })),
      })),
    };

    return jsonResponse(pipeline);
  } catch (error) {
    return errorResponse(error);
  }
}
