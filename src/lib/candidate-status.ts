import type { Stage } from "@prisma/client";

export type CandidateStatus = "new" | "interviewing" | "offer" | "rejected";

export const CANDIDATE_STATUS_OPTIONS: {
  value: CandidateStatus;
  label: string;
}[] = [
  { value: "new", label: "New" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_STAGE_NAMES: Record<CandidateStatus, string[]> = {
  new: ["Applied"],
  interviewing: ["Screening", "Interview"],
  offer: ["Offered", "Hired"],
  rejected: ["Rejected"],
};

export function statusFromStageName(stageName: string): CandidateStatus {
  const normalized = stageName.toLowerCase();

  if (normalized.includes("reject")) return "rejected";
  if (normalized.includes("offer") || normalized.includes("hired")) return "offer";
  if (normalized.includes("interview") || normalized.includes("screen")) {
    return "interviewing";
  }

  return "new";
}

export function findStageForStatus(
  stages: Stage[],
  status: CandidateStatus,
): Stage | undefined {
  const preferredNames = STATUS_STAGE_NAMES[status];

  for (const name of preferredNames) {
    const stage = stages.find(
      (item) => item.name.toLowerCase() === name.toLowerCase(),
    );
    if (stage) return stage;
  }

  if (status === "new") {
    return [...stages].sort(
      (a, b) => a.orderInPipeline - b.orderInPipeline,
    )[0];
  }

  return undefined;
}
