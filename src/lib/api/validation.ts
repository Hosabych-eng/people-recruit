import { JobStatus } from "@prisma/client";
import { ApiError } from "./response";

const JOB_STATUSES = new Set<string>(Object.values(JobStatus));

export function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, `${field} is required and must be a non-empty string`);
  }
  return value.trim();
}

export function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new ApiError(400, "Expected a string value");
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseJobStatus(value: unknown): JobStatus | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !JOB_STATUSES.has(value)) {
    throw new ApiError(400, `status must be one of: ${[...JOB_STATUSES].join(", ")}`);
  }
  return value as JobStatus;
}

export function requireJobStatus(value: unknown): JobStatus {
  const status = parseJobStatus(value);
  if (!status) {
    throw new ApiError(400, `status must be one of: ${[...JOB_STATUSES].join(", ")}`);
  }
  return status;
}

export function parseCreateJobBody(body: Record<string, unknown>) {
  return {
    title: requireString(body.title, "title"),
    description: requireString(body.description, "description"),
    status: parseJobStatus(body.status),
  };
}

export function parseUpdateJobBody(body: Record<string, unknown>) {
  const updates: {
    title?: string;
    description?: string;
    status?: JobStatus;
  } = {};

  if ("title" in body) updates.title = requireString(body.title, "title");
  if ("description" in body) {
    updates.description = requireString(body.description, "description");
  }
  if ("status" in body) updates.status = requireJobStatus(body.status);

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "At least one field must be provided for update");
  }

  return updates;
}

export function parseCreateCandidateBody(body: Record<string, unknown>) {
  return {
    name: requireString(body.name, "name"),
    email: requireString(body.email, "email"),
    phone: optionalString(body.phone),
    resumeLink: optionalString(body.resumeLink),
    jobId: requireString(body.jobId, "jobId"),
    stageId: requireString(body.stageId, "stageId"),
  };
}

export function parseUpdateCandidateBody(body: Record<string, unknown>) {
  const updates: {
    name?: string;
    email?: string;
    phone?: string | null;
    resumeLink?: string | null;
    stageId?: string;
  } = {};

  if ("name" in body) updates.name = requireString(body.name, "name");
  if ("email" in body) updates.email = requireString(body.email, "email");
  if ("phone" in body) {
    updates.phone = body.phone === null ? null : optionalString(body.phone) ?? null;
  }
  if ("resumeLink" in body) {
    updates.resumeLink =
      body.resumeLink === null ? null : optionalString(body.resumeLink) ?? null;
  }
  if ("stageId" in body) updates.stageId = requireString(body.stageId, "stageId");

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "At least one field must be provided for update");
  }

  return updates;
}

export function requireQueryParam(
  searchParams: URLSearchParams,
  key: string,
): string {
  const value = searchParams.get(key);
  if (!value || value.trim().length === 0) {
    throw new ApiError(400, `Query parameter "${key}" is required`);
  }
  return value.trim();
}

export function optionalQueryParam(
  searchParams: URLSearchParams,
  key: string,
): string | undefined {
  const value = searchParams.get(key);
  return value?.trim() || undefined;
}
