export const DEFAULT_PIPELINE_STAGES = [
  { name: "Applied", orderInPipeline: 0 },
  { name: "Screening", orderInPipeline: 1 },
  { name: "Interview", orderInPipeline: 2 },
  { name: "Offered", orderInPipeline: 3 },
  { name: "Hired", orderInPipeline: 4 },
  { name: "Rejected", orderInPipeline: 5 },
] as const;

export type PipelineStageName =
  (typeof DEFAULT_PIPELINE_STAGES)[number]["name"];
