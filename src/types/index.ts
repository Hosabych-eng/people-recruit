import type { Candidate, Job, JobStatus, Stage } from "@prisma/client";

export type { JobStatus };

export type StageWithCandidates = Stage & {
  candidates: Candidate[];
};

export type JobWithPipeline = Job & {
  stages: StageWithCandidates[];
};

export type CandidateWithRelations = Candidate & {
  stage: Stage;
  job: Job;
};

export type CreateJobInput = {
  title: string;
  description: string;
  status?: JobStatus;
};

export type UpdateJobInput = Partial<CreateJobInput>;

export type CreateCandidateInput = {
  name: string;
  email: string;
  phone?: string;
  resumeLink?: string;
  jobId: string;
  stageId: string;
};

export type UpdateCandidateInput = Partial<
  Omit<CreateCandidateInput, "jobId" | "stageId">
> & {
  stageId?: string;
};
