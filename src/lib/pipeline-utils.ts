import type { PipelineCandidate } from "@/types";
import type { JobWithPipeline } from "@/types";
import { statusFromStageName } from "@/lib/candidate-status";

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
  let movedCandidate: PipelineCandidate | null = null;

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
            candidates: [...stage.candidates, movedCandidate as PipelineCandidate],
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
): PipelineCandidate | null {
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

export function countFilledPositions(pipeline: JobWithPipeline): number {
  return pipeline.stages.reduce((total, stage) => {
    const normalized = stage.name.toLowerCase();
    if (!normalized.includes("hired") && !normalized.includes("найнят")) {
      return total;
    }
    return total + stage.candidates.length;
  }, 0);
}

export function isRejectedStageName(stageName: string): boolean {
  return statusFromStageName(stageName) === "rejected";
}

export type PipelineFilterOptions = {
  view: CandidateViewFilter;
  search: string;
  cardFilters: PipelineCardFilter[];
  talentPoolTagId?: string;
};

function matchesCardFilters(
  candidate: PipelineCandidate,
  filters: PipelineCardFilter[],
): boolean {
  if (filters.length === 0) return true;

  return filters.every((filter) => {
    switch (filter) {
      case "hasCv":
        return Boolean(candidate.resumeLink);
      case "hasNotes":
        return candidate._count.candidateNotes > 0;
      case "isNew":
        return candidate.isNew;
      default:
        return true;
    }
  });
}

export function filterPipeline(
  pipeline: JobWithPipeline,
  options: PipelineFilterOptions,
): JobWithPipeline {
  const searchLower = options.search.trim().toLowerCase();

  return {
    ...pipeline,
    stages: pipeline.stages.map((stage) => {
      const rejected = isRejectedStageName(stage.name);

      return {
        ...stage,
        candidates: stage.candidates.filter((candidate) => {
          if (options.view === "active" && rejected) return false;
          if (options.view === "rejected" && !rejected) return false;
          if (options.view === "talent-pool" && !rejected) return false;

          if (searchLower) {
            const skillHaystack = (candidate.skills ?? []).join(" ").toLowerCase();
            const resumeHaystack = (
              (candidate as PipelineCandidate & { resumeText?: string | null }).resumeText ?? ""
            ).toLowerCase();
            const matchesSearch =
              candidate.name.toLowerCase().includes(searchLower) ||
              (candidate.email?.toLowerCase().includes(searchLower) ?? false) ||
              (candidate.phone?.toLowerCase().includes(searchLower) ?? false) ||
              skillHaystack.includes(searchLower) ||
              resumeHaystack.includes(searchLower) ||
              (candidate.tags ?? []).some((tag) =>
                tag.name.toLowerCase().includes(searchLower),
              );

            if (!matchesSearch) return false;
          }

          if (options.view === "talent-pool") {
            if (!rejected) return false;
            if (options.talentPoolTagId) {
              const hasTag = (candidate.tags ?? []).some(
                (tag) => tag.id === options.talentPoolTagId,
              );
              if (!hasTag) return false;
            }
          }

          return matchesCardFilters(candidate, options.cardFilters);
        }),
      };
    }),
  };
}

export type CandidateSortOrder = "newest" | "oldest";

export type CandidateViewFilter = "active" | "rejected" | "talent-pool";

export type PipelineCardFilter = "hasCv" | "hasNotes" | "isNew";

export function sortCandidatesByDate<T extends { createdAt: Date | string }>(
  candidates: T[],
  order: CandidateSortOrder,
): T[] {
  return [...candidates].sort((a, b) => {
    const diff =
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return order === "newest" ? diff : -diff;
  });
}

export function incrementCandidateNoteCount(
  pipeline: JobWithPipeline,
  candidateId: string,
): JobWithPipeline {
  return {
    ...pipeline,
    stages: pipeline.stages.map((stage) => ({
      ...stage,
      candidates: stage.candidates.map((candidate) =>
        candidate.id === candidateId
          ? {
              ...candidate,
              _count: {
                candidateNotes: candidate._count.candidateNotes + 1,
                documents: candidate._count.documents,
              },
            }
          : candidate,
      ),
    })),
  };
}
