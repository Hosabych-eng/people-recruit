import type {
  AnalyticsResponse,
  RecruitingAnalyticsResponse,
  VacancyAnalyticsResponse,
  CandidateDocument,
  CandidateDuplicateHistory,
  CandidateEmailMessage,
  CandidateImportResult,
  CandidateNote,
  CandidateProfile,
  CandidateInterview,
  CandidateLink,
  CandidateTestAssignment,
  CandidateWithRelations,
  CreateCandidateInput,
  CreateCandidateNoteInput,
  CreateEmailTemplateInput,
  CreateInterviewInput,
  UpdateCandidateNoteInput,
  CreateJobInput,
  CreateKnowledgeArticleInput,
  CreateStageInput,
  EmailTemplate,
  ImportCandidateInput,
  JobDetail,
  JobWithCounts,
  JobWithPipeline,
  KnowledgeArticle,
  StageWithCount,
  SendCandidateEmailInput,
  TestAssignmentTemplate,
  TimeToHireAnalyticsResponse,
  UpdateCandidateInput,
  UpdateEmailTemplateInput,
  UpdateJobInput,
  UpdateStageInput,
} from "@/types";
import type { Job, JobStatus, Stage } from "@prisma/client";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  const text = await response.text();
  let data: { error?: string } = {};

  if (text) {
    try {
      data = JSON.parse(text) as { error?: string };
    } catch {
      throw new Error("Invalid server response");
    }
  }

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

    reorderStages: (jobId: string, stageIds: string[]) =>
      request<StageWithCount[]>(`/api/jobs/${jobId}/stages/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ stageIds }),
      }),
  },

  candidates: {
    list: (params?: { jobId?: string; q?: string }) => {
      const search = new URLSearchParams();
      if (params?.jobId) search.set("jobId", params.jobId);
      if (params?.q) search.set("q", params.q);
      const query = search.toString();
      return request<CandidateWithRelations[]>(
        `/api/candidates${query ? `?${query}` : ""}`,
      );
    },

    get: (id: string) =>
      request<CandidateWithRelations>(`/api/candidates/${id}`),

    profile: (id: string) =>
      request<CandidateProfile>(`/api/candidates/${id}/profile`),

    neighbors: (id: string) =>
      request<{
        prevId: string | null;
        nextId: string | null;
        position: number | null;
        total: number;
      }>(`/api/candidates/${id}/neighbors`),

    create: (input: CreateCandidateInput) =>
      request<CandidateImportResult>("/api/candidates", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    import: (input: ImportCandidateInput) =>
      request<CandidateImportResult>("/api/candidates/import", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    update: (id: string, input: UpdateCandidateInput) =>
      request<CandidateWithRelations>(`/api/candidates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),

    updateStage: (
      id: string,
      stageId: string,
      input?: {
        rejectionReasonId?: string;
        rejectionNote?: string;
        talentPoolTagIds?: string[];
      },
    ) =>
      request<CandidateWithRelations>(`/api/candidates/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ stageId, ...input }),
      }),

    delete: (id: string) =>
      request<{ success: boolean }>(`/api/candidates/${id}`, {
        method: "DELETE",
      }),

    links: {
      list: (candidateId: string) =>
        request<CandidateLink[]>(`/api/candidates/${candidateId}/links`),

      create: (candidateId: string, input: { label: string; url: string }) =>
        request<CandidateLink>(`/api/candidates/${candidateId}/links`, {
          method: "POST",
          body: JSON.stringify(input),
        }),

      update: (
        candidateId: string,
        linkId: string,
        input: Partial<{ label: string; url: string }>,
      ) =>
        request<CandidateLink>(`/api/candidates/${candidateId}/links/${linkId}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),

      delete: (candidateId: string, linkId: string) =>
        request<{ success: boolean }>(
          `/api/candidates/${candidateId}/links/${linkId}`,
          { method: "DELETE" },
        ),
    },

    notes: {
      list: (candidateId: string) =>
        request<CandidateNote[]>(`/api/candidates/${candidateId}/notes`),

      create: (candidateId: string, input: CreateCandidateNoteInput) =>
        request<CandidateNote>(`/api/candidates/${candidateId}/notes`, {
          method: "POST",
          body: JSON.stringify(input),
        }),

      update: (candidateId: string, noteId: string, input: UpdateCandidateNoteInput) =>
        request<CandidateNote>(`/api/candidates/${candidateId}/notes/${noteId}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),

      delete: (candidateId: string, noteId: string) =>
        request<{ success: boolean }>(
          `/api/candidates/${candidateId}/notes/${noteId}`,
          { method: "DELETE" },
        ),
    },

    interviews: {
      list: (candidateId: string) =>
        request<CandidateInterview[]>(`/api/candidates/${candidateId}/interviews`),

      create: (candidateId: string, input: CreateInterviewInput) =>
        request<CandidateInterview>(`/api/candidates/${candidateId}/interviews`, {
          method: "POST",
          body: JSON.stringify(input),
        }),
    },

    emails: {
      send: (candidateId: string, input: SendCandidateEmailInput) =>
        request<CandidateEmailMessage>(`/api/candidates/${candidateId}/emails`, {
          method: "POST",
          body: JSON.stringify(input),
        }),
    },

    testAssignments: {
      list: (candidateId: string) =>
        request<CandidateTestAssignment[]>(
          `/api/candidates/${candidateId}/test-assignments`,
        ),

      send: (candidateId: string, templateId: string) =>
        request<CandidateTestAssignment>(
          `/api/candidates/${candidateId}/test-assignments`,
          {
            method: "POST",
            body: JSON.stringify({ templateId }),
          },
        ),
    },

    documents: {
      list: (candidateId: string) =>
        request<CandidateDocument[]>(`/api/candidates/${candidateId}/documents`),

      upload: async (
        candidateId: string,
        input: { title: string; category: CandidateDocument["category"]; file: File },
      ) => {
        const formData = new FormData();
        formData.set("title", input.title);
        formData.set("category", input.category);
        formData.set("file", input.file);

        const response = await fetch(`/api/candidates/${candidateId}/documents`, {
          method: "POST",
          credentials: "same-origin",
          body: formData,
        });

        const text = await response.text();
        let data: { error?: string } = {};
        if (text) {
          data = JSON.parse(text) as { error?: string };
        }
        if (!response.ok) {
          throw new Error(data.error ?? `Request failed: ${response.status}`);
        }
        return data as CandidateDocument;
      },

      downloadUrl: (candidateId: string, documentId: string) =>
        `/api/candidates/${candidateId}/documents/${documentId}`,

      delete: (candidateId: string, documentId: string) =>
        request<{ success: boolean }>(
          `/api/candidates/${candidateId}/documents/${documentId}`,
          { method: "DELETE" },
        ),
    },
  },

  testAssignmentTemplates: {
    list: () => request<TestAssignmentTemplate[]>("/api/test-assignment-templates"),

    upload: async (input: { title: string; description?: string; file: File }) => {
      const formData = new FormData();
      formData.set("title", input.title);
      if (input.description) formData.set("description", input.description);
      formData.set("file", input.file);

      const response = await fetch("/api/test-assignment-templates", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });

      const text = await response.text();
      let data: { error?: string } = {};
      if (text) {
        data = JSON.parse(text) as { error?: string };
      }
      if (!response.ok) {
        throw new Error(data.error ?? `Request failed: ${response.status}`);
      }
      return data as TestAssignmentTemplate;
    },

    downloadUrl: (id: string) => `/api/test-assignment-templates/${id}`,

    delete: (id: string) =>
      request<{ success: boolean }>(`/api/test-assignment-templates/${id}`, {
        method: "DELETE",
      }),
  },

  emailTemplates: {
    list: () => request<EmailTemplate[]>("/api/email-templates"),

    create: (input: CreateEmailTemplateInput) =>
      request<EmailTemplate>("/api/email-templates", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    update: (id: string, input: UpdateEmailTemplateInput) =>
      request<EmailTemplate>(`/api/email-templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),

    delete: (id: string) =>
      request<{ success: boolean }>(`/api/email-templates/${id}`, {
        method: "DELETE",
      }),
  },

  analytics: {
    get: (from: string, to: string) =>
      request<AnalyticsResponse>(
        `/api/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      ),
  },

  recruitingAnalytics: {
    get: (from: string, to: string, jobId?: string) => {
      const params = new URLSearchParams({ from, to });
      if (jobId) params.set("jobId", jobId);
      return request<RecruitingAnalyticsResponse>(
        `/api/recruiting/analytics?${params.toString()}`,
      );
    },
  },

  timeToHireAnalytics: {
    get: (from: string, to: string, jobId?: string) => {
      const params = new URLSearchParams({ from, to });
      if (jobId) params.set("jobId", jobId);
      return request<TimeToHireAnalyticsResponse>(
        `/api/analytics/time-to-hire?${params.toString()}`,
      );
    },
  },

  vacancyReports: {
    get: (jobId: string, from: string, to: string, mock = false) => {
      const params = new URLSearchParams({ from, to });
      if (mock) params.set("mock", "1");
      return request<VacancyAnalyticsResponse>(
        `/api/vacancies/${jobId}/reports?${params.toString()}`,
      );
    },
  },

  knowledge: {
    list: () => request<KnowledgeArticle[]>("/api/knowledge"),

    create: (input: CreateKnowledgeArticleInput) =>
      request<KnowledgeArticle>("/api/knowledge", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },

  stages: {
    list: (jobId: string) =>
      request<StageWithCount[]>(
        `/api/stages?jobId=${encodeURIComponent(jobId)}`,
      ),

    create: (input: CreateStageInput) =>
      request<StageWithCount>("/api/stages", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    update: (id: string, input: UpdateStageInput) =>
      request<StageWithCount>(`/api/stages/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),

    delete: (id: string) =>
      request<{ success: boolean }>(`/api/stages/${id}`, {
        method: "DELETE",
      }),
  },

  recruiters: {
    list: () =>
      request<Array<{ id: string; name: string | null; email: string; image: string | null }>>(
        "/api/recruiters",
      ),
  },
};

export type { JobStatus };
