import type { LanguageType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ensureDefaultCandidateFields } from "@/lib/candidate-fields";
import { ensureDefaultRejectionReasons } from "@/lib/rejection-reasons";

export { ensureDefaultCandidateFields, ensureDefaultRejectionReasons };

const DEFAULT_STAGE_TEMPLATES = [
  { name: "New candidate", orderInPipeline: 0, color: "#0ea5e9" },
  { name: "Screening", orderInPipeline: 1, color: "#8b5cf6" },
  { name: "Interview", orderInPipeline: 2, color: "#f59e0b" },
  { name: "Offered", orderInPipeline: 3, color: "#10b981" },
  { name: "Hired", orderInPipeline: 4, color: "#22c55e" },
  { name: "Rejected", orderInPipeline: 5, color: "#ef4444" },
];

const DEFAULT_TAGS = [
  { name: "Пріоритет", color: "#ef4444" },
  { name: "Релокація", color: "#3b82f6" },
  { name: "Senior", color: "#8b5cf6" },
];

const DEFAULT_LANGUAGE_LEVELS: Record<LanguageType, string[]> = {
  ENGLISH: ["A1", "A2", "B1", "B2", "C1", "C2", "Native"],
  CHINESE: ["HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6", "Native"],
};

export async function ensureDefaultSettings() {
  const stageCount = await prisma.pipelineStageTemplate.count();
  if (stageCount === 0) {
    await prisma.pipelineStageTemplate.createMany({
      data: DEFAULT_STAGE_TEMPLATES,
      skipDuplicates: true,
    });
  }

  const tagCount = await prisma.candidateTag.count();
  if (tagCount === 0) {
    await prisma.candidateTag.createMany({
      data: DEFAULT_TAGS,
      skipDuplicates: true,
    });
  }

  for (const [language, labels] of Object.entries(DEFAULT_LANGUAGE_LEVELS) as [
    LanguageType,
    string[],
  ][]) {
    const count = await prisma.languageLevelOption.count({ where: { language } });
    if (count === 0) {
      await prisma.languageLevelOption.createMany({
        data: labels.map((label, index) => ({
          language,
          label,
          sortOrder: index,
        })),
        skipDuplicates: true,
      });
    }
  }

  await ensureDefaultRejectionReasons();
}

export async function findNewCandidateStage(jobId: string) {
  const preferred = await prisma.stage.findFirst({
    where: {
      jobId,
      name: { in: ["New candidate", "Applied", "Новий кандидат"] },
    },
    orderBy: { orderInPipeline: "asc" },
  });

  if (preferred) return preferred;

  return prisma.stage.findFirst({
    where: { jobId },
    orderBy: { orderInPipeline: "asc" },
  });
}

export async function syncCandidateApplication(
  candidateId: string,
  jobId: string,
  stageId: string,
) {
  return prisma.candidateApplication.upsert({
    where: { candidateId_jobId: { candidateId, jobId } },
    create: { candidateId, jobId, stageId },
    update: { stageId },
  });
}
