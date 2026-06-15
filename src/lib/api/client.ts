import type {
  CandidateWithRelations,
  CreateCandidateInput,
  CreateJobInput,
  JobWithPipeline,
  UpdateCandidateInput,
  UpdateJobInput,
} from "@/types";
import type { Candidate, Job, JobStatus, Stage } from "@prisma/client";

type JobWithCounts = Job & {
  _count: { candidates: number; stages: number };
};

type JobDetail = Job & {
  stages: Stage[];
  _count: { candidates: number };
};

type StageWithCount = Stage & {
  _count: { candidates: number };
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? `Request failed: ${response.status}`);
  }

  return data as T;
}

export const api = {
  jobs: {
    list: () => request<JobWithCounts[]>("/api/jobs"),

    get: (id: string) => request<JobDetail>(`/api/jobs/${id}`),

    create: (input: CreateJobInput) =>
      request<Job & { stages: Stage[] }>("/api/jobs", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    update: (id: string, input: UpdateJobInput) =>
      request<Job & { stages: Stage[] }>(`/api/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),

    delete: (id: string) =>
      request<{ success: boolean }>(`/api/jobs/${id}`, { method: "DELETE" }),

    pipeline: (id: string) =>
      request<JobWithPipeline>(`/api/jobs/${id}/pipeline`),
  },

  candidates: {
    list: (jobId?: string) => {
      const query = jobId ? `?jobId=${encodeURIComponent(jobId)}` : "";
      return request<CandidateWithRelations[]>(`/api/candidates${query}`);
    },

    get: (id: string) =>
      request<CandidateWithRelations>(`/api/candidates/${id}`),

    create: (input: CreateCandidateInput) =>
      request<CandidateWithRelations>("/api/candidates", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    update: (id: string, input: UpdateCandidateInput) =>
      request<CandidateWithRelations>(`/api/candidates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),

    updateStage: (id: string, stageId: string) =>
      request<CandidateWithRelations>(`/api/candidates/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ stageId }),
      }),

    delete: (id: string) =>
      request<{ success: boolean }>(`/api/candidates/${id}`, {
        method: "DELETE",
      }),
  },

  stages: {
    list: (jobId: string) =>
      request<StageWithCount[]>(
        `/api/stages?jobId=${encodeURIComponent(jobId)}`,
      ),
  },
};

export type { JobStatus };
