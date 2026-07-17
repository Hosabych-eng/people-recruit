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
    location: optionalString(body.location),
    employmentType: optionalString(body.employmentType),
  };
}

export function parseUpdateJobBody(body: Record<string, unknown>) {
  const updates: {
    title?: string;
    description?: string;
    status?: JobStatus;
    recruiterId?: string | null;
  } = {};

  if ("title" in body) updates.title = requireString(body.title, "title");
  if ("description" in body) {
    updates.description = requireString(body.description, "description");
  }
  if ("status" in body) updates.status = requireJobStatus(body.status);
  if ("recruiterId" in body) {
    updates.recruiterId =
      body.recruiterId === null ? null : optionalString(body.recruiterId) ?? null;
  }

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
    expectedSalary: parseOptionalPositiveInt(body.expectedSalary, "expectedSalary"),
    salaryCurrency: optionalString(body.salaryCurrency),
    jobId: requireString(body.jobId, "jobId"),
    stageId: requireString(body.stageId, "stageId"),
  };
}

const APPLICATION_SOURCES = new Set([
  "DJINNI",
  "DOU",
  "LINKEDIN",
  "ROBOTA_UA",
  "SNOOPGAME",
  "MANUAL",
  "CAREER_SITE",
  "CAREERS",
]);

function parseApplicationSource(value: unknown) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !APPLICATION_SOURCES.has(value)) {
    throw new ApiError(400, `Invalid applicationSource: ${String(value)}`);
  }
  return value as
    | "DJINNI"
    | "DOU"
    | "LINKEDIN"
    | "ROBOTA_UA"
    | "SNOOPGAME"
    | "MANUAL"
    | "CAREER_SITE"
    | "CAREERS";
}

export function parseImportCandidateBody(body: Record<string, unknown>) {
  return {
    jobId: requireString(body.jobId, "jobId"),
    stageId: requireString(body.stageId, "stageId"),
    rawInput: optionalString(body.rawInput),
    name: optionalString(body.name),
    email: optionalString(body.email),
    phone: optionalString(body.phone),
    resumeLink: optionalString(body.resumeLink),
    avatarUrl: optionalString(body.avatarUrl),
    applicationSource: parseApplicationSource(body.applicationSource),
  };
}

export function parseUpdateCandidateBody(body: Record<string, unknown>) {
  const updates: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    resumeLink?: string | null;
    expectedSalary?: number | null;
    salaryCurrency?: string | null;
    stageId?: string;
    isNew?: boolean;
    score?: number | null;
    englishLevel?: string | null;
    chineseLevel?: string | null;
    position?: string | null;
    coverLetter?: string | null;
    rejectionReasonId?: string | null;
    rejectionNote?: string | null;
    location?: string | null;
    telegram?: string | null;
    offerLink?: string | null;
    firstContactDate?: Date | null;
    lastContactDate?: Date | null;
    recruiterId?: string | null;
  } = {};

  if ("name" in body) updates.name = requireString(body.name, "name");
  if ("email" in body) {
    updates.email =
      body.email === null || body.email === ""
        ? null
        : requireString(body.email, "email");
  }
  if ("phone" in body) {
    updates.phone = body.phone === null ? null : optionalString(body.phone) ?? null;
  }
  if ("resumeLink" in body) {
    updates.resumeLink =
      body.resumeLink === null ? null : optionalString(body.resumeLink) ?? null;
  }
  if ("expectedSalary" in body) {
    updates.expectedSalary =
      body.expectedSalary === null
        ? null
        : parseOptionalPositiveInt(body.expectedSalary, "expectedSalary");
  }
  if ("salaryCurrency" in body) {
    updates.salaryCurrency =
      body.salaryCurrency === null
        ? null
        : optionalString(body.salaryCurrency) ?? null;
  }
  if ("isNew" in body) {
    if (typeof body.isNew !== "boolean") {
      throw new ApiError(400, "isNew must be a boolean");
    }
    updates.isNew = body.isNew;
  }
  if ("score" in body) {
    const score = body.score === null ? null : Number(body.score);
    if (score !== null && (!Number.isInteger(score) || score < 0 || score > 5)) {
      throw new ApiError(400, "score must be between 0 and 5");
    }
    updates.score = score;
  }
  if ("stageId" in body) updates.stageId = requireString(body.stageId, "stageId");
  if ("position" in body) {
    updates.position =
      body.position === null ? null : optionalString(body.position) ?? null;
  }
  if ("englishLevel" in body) {
    updates.englishLevel =
      body.englishLevel === null ? null : optionalString(body.englishLevel) ?? null;
  }
  if ("chineseLevel" in body) {
    updates.chineseLevel =
      body.chineseLevel === null ? null : optionalString(body.chineseLevel) ?? null;
  }
  if ("coverLetter" in body) {
    updates.coverLetter =
      body.coverLetter === null ? null : optionalString(body.coverLetter) ?? null;
  }
  if ("rejectionReasonId" in body) {
    updates.rejectionReasonId =
      body.rejectionReasonId === null
        ? null
        : requireString(body.rejectionReasonId, "rejectionReasonId");
  }
  if ("rejectionNote" in body) {
    updates.rejectionNote =
      body.rejectionNote === null ? null : optionalString(body.rejectionNote) ?? null;
  }
  if ("location" in body) {
    updates.location =
      body.location === null ? null : optionalString(body.location) ?? null;
  }
  if ("telegram" in body) {
    updates.telegram =
      body.telegram === null ? null : optionalString(body.telegram) ?? null;
  }
  if ("offerLink" in body) {
    updates.offerLink =
      body.offerLink === null ? null : optionalString(body.offerLink) ?? null;
  }
  if ("firstContactDate" in body) {
    updates.firstContactDate = parseOptionalDate(body.firstContactDate, "firstContactDate");
  }
  if ("lastContactDate" in body) {
    updates.lastContactDate = parseOptionalDate(body.lastContactDate, "lastContactDate");
  }
  if ("recruiterId" in body) {
    updates.recruiterId =
      body.recruiterId === null || body.recruiterId === ""
        ? null
        : requireString(body.recruiterId, "recruiterId");
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "At least one field must be provided for update");
  }

  return updates;
}

export function parseCreateStageBody(body: Record<string, unknown>) {
  return {
    jobId: requireString(body.jobId, "jobId"),
    name: requireString(body.name, "name"),
  };
}

export function parseUpdateStageBody(body: Record<string, unknown>) {
  const updates: {
    name?: string;
    automationEnabled?: boolean;
  } = {};

  if ("name" in body) updates.name = requireString(body.name, "name");
  if ("automationEnabled" in body) {
    if (typeof body.automationEnabled !== "boolean") {
      throw new ApiError(400, "automationEnabled must be a boolean");
    }
    updates.automationEnabled = body.automationEnabled;
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "At least one field must be provided for update");
  }

  return updates;
}

export function parseReorderStagesBody(body: Record<string, unknown>) {
  if (!Array.isArray(body.stageIds)) {
    throw new ApiError(400, "stageIds must be an array");
  }

  const stageIds = body.stageIds.map((value, index) => {
    if (typeof value !== "string" || !value.trim()) {
      throw new ApiError(400, `stageIds[${index}] must be a non-empty string`);
    }
    return value.trim();
  });

  if (stageIds.length === 0) {
    throw new ApiError(400, "stageIds cannot be empty");
  }

  return { stageIds };
}

export function parseCreateKnowledgeArticleBody(body: Record<string, unknown>) {
  return {
    title: requireString(body.title, "title"),
    content: requireString(body.content, "content"),
  };
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

function parseOptionalPositiveInt(
  value: unknown,
  field: string,
): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ApiError(400, `${field} must be a non-negative integer`);
  }
  return parsed;
}

function parseOptionalDate(value: unknown, field: string): Date | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string" && typeof value !== "number") {
    throw new ApiError(400, `${field} must be a valid date string or null`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${field} must be a valid date`);
  }
  return date;
}

const INTERVIEW_TYPES = new Set(["ONLINE", "ONSITE", "PHONE"]);

export function parseCreateInterviewBody(body: Record<string, unknown>) {
  const scheduledAtRaw = requireString(body.scheduledAt, "scheduledAt");
  const scheduledAt = new Date(scheduledAtRaw);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new ApiError(400, "scheduledAt must be a valid ISO date");
  }

  const type =
    body.type === undefined
      ? "ONLINE"
      : typeof body.type === "string" && INTERVIEW_TYPES.has(body.type)
        ? body.type
        : null;

  if (!type) {
    throw new ApiError(400, "type must be one of: ONLINE, ONSITE, PHONE");
  }

  const durationMinutes =
    parseOptionalPositiveInt(body.durationMinutes, "durationMinutes") ?? 45;

  if (durationMinutes < 15 || durationMinutes > 240) {
    throw new ApiError(400, "durationMinutes must be between 15 and 240");
  }

  return {
    title: requireString(body.title, "title"),
    scheduledAt,
    type: type as "ONLINE" | "ONSITE" | "PHONE",
    durationMinutes,
  };
}

export function parseCreateEmailTemplateBody(body: Record<string, unknown>) {
  return {
    title: requireString(body.title, "title"),
    subject: requireString(body.subject, "subject"),
    body: requireString(body.body, "body"),
  };
}

export function parseUpdateEmailTemplateBody(body: Record<string, unknown>) {
  const updates: {
    title?: string;
    subject?: string;
    body?: string;
  } = {};

  if ("title" in body) updates.title = requireString(body.title, "title");
  if ("subject" in body) updates.subject = requireString(body.subject, "subject");
  if ("body" in body) updates.body = requireString(body.body, "body");

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "At least one field must be provided for update");
  }

  return updates;
}

export function parseSendCandidateEmailBody(body: Record<string, unknown>) {
  return {
    subject: requireString(body.subject, "subject"),
    body: requireString(body.body, "body"),
    cc: parseCcEmails(body.cc),
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseCcEmails(value: unknown): string[] {
  if (value === undefined || value === null || value === "") return [];

  const raw =
    typeof value === "string"
      ? value.split(/[,;]+/)
      : Array.isArray(value)
        ? value.map((item) => String(item))
        : null;

  if (!raw) {
    throw new ApiError(400, "cc must be a comma-separated string or array of emails");
  }

  const emails = [...new Set(raw.map((item) => item.trim()).filter(Boolean))];

  for (const email of emails) {
    if (!EMAIL_PATTERN.test(email)) {
      throw new ApiError(400, `Invalid CC email: ${email}`);
    }
  }

  return emails;
}
