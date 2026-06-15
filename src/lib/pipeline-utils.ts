import type { Candidate } from "@prisma/client";
import type { JobWithPipeline } from "@/types";

export const STAGE_PREFIX = "stage:";
export const CANDIDATE_PREFIX = "candidate:";

export function stageDndId(stageId: string) {
  return `${STAGE_PREFIX}${stageId}`;
}

export function candidateDndId(candidateId: string) {
  return `${CANDIDATE_PREFIX}${candidateId}`;
}

export function moveCandidateBetweenStages(
  pipeline: JobWithPipeline,
  candidateId: string,
  targetStageId: string,
): JobWithPipeline {
  let movedCandidate: Candidate | null = null;

  const stagesWithoutCandidate = pipeline.stages.map((stage) => {
    const candidates = stage.candidates.filter((candidate) => {
      if (candidate.id === candidateId) {
        movedCandidate = candidate;
        return false;
      }
      return true;
    });
    return { ...stage, candidates };
  });

  if (!movedCandidate) return pipeline;

  return {
    ...pipeline,
    stages: stagesWithoutCandidate.map((stage) =>
      stage.id === targetStageId
        ? {
            ...stage,
            candidates: [...stage.candidates, movedCandidate as Candidate],
          }
        : stage,
    ),
  };
}

export function resolveTargetStageId(
  pipeline: JobWithPipeline,
  overId: string,
): string | null {
  if (overId.startsWith(STAGE_PREFIX)) {
    return overId.slice(STAGE_PREFIX.length);
  }

  if (overId.startsWith(CANDIDATE_PREFIX)) {
    const candidateId = overId.slice(CANDIDATE_PREFIX.length);
    const stage = pipeline.stages.find((item) =>
      item.candidates.some((candidate) => candidate.id === candidateId),
    );
    return stage?.id ?? null;
  }

  return null;
}

export function findCandidateInPipeline(
  pipeline: JobWithPipeline,
  candidateId: string,
): Candidate | null {
  for (const stage of pipeline.stages) {
    const candidate = stage.candidates.find((item) => item.id === candidateId);
    if (candidate) return candidate;
  }
  return null;
}

export function getCandidateStageId(
  pipeline: JobWithPipeline,
  candidateId: string,
): string | null {
  for (const stage of pipeline.stages) {
    if (stage.candidates.some((candidate) => candidate.id === candidateId)) {
      return stage.id;
    }
  }
  return null;
}

export function countCandidates(pipeline: JobWithPipeline): number {
  return pipeline.stages.reduce(
    (total, stage) => total + stage.candidates.length,
    0,
  );
}
