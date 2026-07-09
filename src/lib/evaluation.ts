import prisma from "@/lib/prisma";

export async function getJobEvaluationCriteria(jobId: string) {
  return prisma.jobEvaluationCriterion.findMany({
    where: { jobId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function upsertJobEvaluationCriteria(jobId: string, names: string[]) {
  const trimmed = names.map((n) => n.trim()).filter(Boolean).slice(0, 5);
  await prisma.jobEvaluationCriterion.deleteMany({ where: { jobId } });

  if (trimmed.length === 0) return [];

  await prisma.jobEvaluationCriterion.createMany({
    data: trimmed.map((name, index) => ({ jobId, name, sortOrder: index })),
  });

  return getJobEvaluationCriteria(jobId);
}

export async function saveCandidateEvaluationScores(input: {
  candidateId: string;
  authorId: string;
  authorName: string;
  scores: { criterionId: string; score: number }[];
}) {
  for (const row of input.scores) {
    const score = Math.max(1, Math.min(5, Math.round(row.score)));
    await prisma.candidateEvaluationScore.upsert({
      where: {
        candidateId_criterionId: {
          candidateId: input.candidateId,
          criterionId: row.criterionId,
        },
      },
      create: {
        candidateId: input.candidateId,
        criterionId: row.criterionId,
        score,
        authorId: input.authorId,
        authorName: input.authorName,
      },
      update: { score, authorId: input.authorId, authorName: input.authorName },
    });
  }

  const allScores = await prisma.candidateEvaluationScore.findMany({
    where: { candidateId: input.candidateId },
    select: { score: true },
  });

  const average =
    allScores.length > 0
      ? allScores.reduce((sum, row) => sum + row.score, 0) / allScores.length
      : null;

  await prisma.candidate.update({
    where: { id: input.candidateId },
    data: { evaluationAverage: average },
  });

  return { average, scores: allScores };
}

export async function getCandidateEvaluation(candidateId: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { evaluationAverage: true, jobId: true },
  });
  if (!candidate) return null;

  const [jobCriteria, scores] = await Promise.all([
    getJobEvaluationCriteria(candidate.jobId),
    prisma.candidateEvaluationScore.findMany({
      where: { candidateId },
      include: { criterion: true },
    }),
  ]);

  return {
    average: candidate.evaluationAverage,
    criteria: jobCriteria,
    scores: scores.map((row) => ({
      criterionId: row.criterionId,
      criterionName: row.criterion.name,
      score: row.score,
      authorName: row.authorName,
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}
