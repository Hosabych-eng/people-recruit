const PEOPLEFORCE_API_BASE =
  process.env.PEOPLEFORCE_API_BASE ?? "https://app.peopleforce.io/api/public/v3";

type PeopleForceListResponse<T> = {
  data: T[];
  pagination?: {
    page?: number;
    pages?: number;
    count?: number;
    items?: number;
  };
};

export type PeopleForceVacancy = {
  id: number;
  title: string;
  description?: string | null;
  state?: string;
  pipeline_id?: number | string | null;
};

export type PeopleForcePipelineStage = {
  id: number | string;
  name: string;
  position?: number | string;
};

export type PeopleForcePipeline = {
  id: number | string;
  name: string;
  stages?: PeopleForcePipelineStage[];
};

export type PeopleForceApplicant = {
  id: number;
  full_name?: string;
  email?: string | null;
  phone_numbers?: { number?: string }[] | string[];
};

export type PeopleForceApplication = {
  id: number;
  applicant: PeopleForceApplicant;
  pipeline_state?: { id: number | string; name: string } | null;
  disqualified_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type PeopleForceCandidate = {
  id: number;
  full_name?: string;
  email?: string | null;
  phone_numbers?: { number?: string }[] | string[];
  resume?: { url?: string; file_name?: string; content_type?: string } | null;
  cover_letter?: string | null;
  desired_salary?: number | null;
  desired_salary_currency?: string | null;
};

export type PeopleForceCandidateNote = {
  id: number;
  comment?: string;
  created_at?: string;
  author?: { full_name?: string } | null;
};

export class PeopleForceClient {
  constructor(private readonly apiToken: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${PEOPLEFORCE_API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "X-API-KEY": this.apiToken,
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`PeopleForce API ${response.status}: ${body.slice(0, 240)}`);
    }

    return response.json() as Promise<T>;
  }

  private async listAll<T>(path: string): Promise<T[]> {
    const items: T[] = [];
    let page = 1;
    let pages = 1;

    while (page <= pages) {
      const separator = path.includes("?") ? "&" : "?";
      const payload = await this.request<PeopleForceListResponse<T>>(
        `${path}${separator}page=${page}`,
      );
      items.push(...(payload.data ?? []));
      pages = payload.pagination?.pages ?? 1;
      page += 1;
    }

    return items;
  }

  listVacancies() {
    return this.listAll<PeopleForceVacancy>("/recruitment/vacancies");
  }

  listPipelines() {
    return this.listAll<PeopleForcePipeline>("/recruitment/pipelines");
  }

  listVacancyApplications(vacancyId: number) {
    return this.listAll<PeopleForceApplication>(`/recruitment/vacancies/${vacancyId}/applications`);
  }

  getCandidate(candidateId: number) {
    return this.request<{ data: PeopleForceCandidate }>(`/recruitment/candidates/${candidateId}`).then(
      (payload) => payload.data,
    );
  }

  listCandidateNotes(candidateId: number) {
    return this.listAll<PeopleForceCandidateNote>(
      `/recruitment/candidates/${candidateId}/notes`,
    );
  }
}
