import type { Candidate, Job, JobStatus, Stage } from "@prisma/client";

export type { JobStatus };

export type StageWithCount = Stage & {
  _count: { candidates: number };
};

export type JobWithCounts = Job & {
  _count: { candidates: number; stages: number };
};

export type JobDetail = Job & {
  stages: StageWithCount[];
  _count: { candidates: number };
};

export type CreateStageInput = {
  jobId: string;
  name: string;
};

export type UpdateStageInput = {
  name?: string;
  automationEnabled?: boolean;
};

export type PipelineCandidate = Candidate & {
  _count: { candidateNotes: number };
  expectedSalary?: number | null;
  salaryCurrency?: string | null;
  isNew?: boolean;
};

export type StageWithCandidates = Stage & {
  candidates: PipelineCandidate[];
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
  location?: string;
  employmentType?: string;
};

export type UpdateJobInput = Partial<CreateJobInput>;

export type CreateCandidateInput = {
  name: string;
  email: string;
  phone?: string;
  resumeLink?: string;
  expectedSalary?: number;
  salaryCurrency?: string;
  jobId: string;
  stageId: string;
};

export type UpdateCandidateInput = Partial<{
  name: string;
  email: string;
  phone: string | null;
  resumeLink: string | null;
  expectedSalary: number | null;
  salaryCurrency: string | null;
  stageId: string;
  isNew: boolean;
}>;

export type CandidateNote = {
  id: string;
  content: string;
  candidateId: string;
  authorId: string | null;
  authorName: string;
  authorRole?: string | null;
  authorPhotoUrl: string | null;
  createdAt: string;
};

export type CreateCandidateNoteInput = {
  content: string;
};

export type UpdateCandidateNoteInput = {
  content: string;
};

export type CandidateInterview = {
  id: string;
  candidateId: string;
  title: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  scheduledAt: string;
  type: "ONLINE" | "ONSITE" | "PHONE";
  durationMinutes: number;
  messageBody: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateInterviewInput = {
  title: string;
  scheduledAt: string;
  durationMinutes?: number;
  type?: "ONLINE" | "ONSITE" | "PHONE";
};

export type CandidateEmailMessage = {
  id: string;
  candidateId: string;
  interviewId: string | null;
  direction: "OUTBOUND" | "INBOUND";
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED" | "RECEIVED";
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  body: string;
  sentAt: string;
  createdAt: string;
};

export type TestAssignmentTemplate = {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
};

export type CandidateTestAssignment = {
  id: string;
  candidateId: string;
  templateId: string;
  templateTitle: string;
  templateFileName: string;
  sentByName: string;
  status: "QUEUED" | "SENT" | "FAILED";
  gmailMessageId: string | null;
  sentAt: string | null;
  createdAt: string;
};

export type CandidateDocument = {
  id: string;
  candidateId: string;
  category: "RESUME" | "PORTFOLIO" | "OTHER";
  title: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedByName: string;
  createdAt: string;
};

export type CandidateDuplicateHistory = {
  lastEmail: {
    sentAt: string;
    status: string;
    subject: string;
  } | null;
  lastTestAssignment: {
    templateTitle: string;
    status: string;
    sentAt: string | null;
  } | null;
};

export type CandidateImportResult = {
  isDuplicate: boolean;
  candidate: CandidateWithRelations;
  history?: CandidateDuplicateHistory;
};

export type ImportCandidateInput = {
  jobId: string;
  stageId: string;
  rawInput?: string;
  name?: string;
  email?: string;
  phone?: string;
  resumeLink?: string;
  applicationSource?: string;
};

export type EmailTemplate = {
  id: string;
  title: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateEmailTemplateInput = {
  title: string;
  subject: string;
  body: string;
};

export type UpdateEmailTemplateInput = Partial<CreateEmailTemplateInput>;

export type SendCandidateEmailInput = {
  subject: string;
  body: string;
};

export type CandidateProfile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  resumeLink: string | null;
  applicationSource: string;
  isNew: boolean;
  createdAt: string;
  stage: { id: string; name: string };
  job: { id: string; title: string };
  notes: CandidateNote[];
  interviews: CandidateInterview[];
  emails: CandidateEmailMessage[];
  testAssignments: CandidateTestAssignment[];
  documents: CandidateDocument[];
};

export type AnalyticsSummary = {
  recruitingIn: number;
  recruitingOut: number;
  onboarding: number;
  offboarding: number;
  total: number;
};

export type AnalyticsTimelinePoint = {
  date: string;
  recruitingIn: number;
  recruitingOut: number;
  onboarding: number;
  offboarding: number;
};

export type AnalyticsEvent = {
  id: string;
  type: "RECRUITING_IN" | "RECRUITING_OUT" | "ONBOARDING" | "OFFBOARDING";
  personName: string;
  jobTitle: string | null;
  note: string | null;
  occurredAt: string;
};

export type AnalyticsCategory = {
  key: keyof AnalyticsSummary;
  label: string;
  description: string;
  type: AnalyticsEvent["type"];
};

export type AnalyticsResponse = {
  period: {
    from: string;
    to: string;
  };
  summary: AnalyticsSummary;
  timeline: AnalyticsTimelinePoint[];
  recentEvents: AnalyticsEvent[];
  categories: AnalyticsCategory[];
};

export type RecruitingAnalyticsSummary = {
  activeCandidates: number;
  rejected: number;
  interviews: number;
  offersSent: number;
  offersAccepted: number;
  averageScore: number;
  ratingsCount?: number;
};

export type RecruitingFunnelStep = {
  stage: string;
  count: number;
  efficiency: number;
};

export type CompensationSummary = {
  avgUsd: number;
  minUsd: number;
  maxUsd: number;
};

export type RecruitingAnalyticsResponse = {
  period: {
    from: string;
    to: string;
  };
  summary: RecruitingAnalyticsSummary;
  candidatesBySource: Array<Record<string, number | string> & { date: string }>;
  funnel: RecruitingFunnelStep[];
  compensation: {
    curve: Array<{ salaryUsd: number; count: number }>;
    scatter: Array<{ salaryUsd: number; density: number }>;
  };
  compensationSummary?: CompensationSummary;
  sourcesBreakdown: Array<{
    source: string;
    label: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  emails: {
    sent: number;
    received: number;
  };
  sourceLegend: Array<{
    key: string;
    label: string;
    color: string;
  }>;
};

export type VacancyAnalyticsResponse = RecruitingAnalyticsResponse & {
  job: {
    id: string;
    title: string;
  };
  compensationSummary: CompensationSummary;
};

export type KnowledgeArticle = {
  id: string;
  title: string;
  content: string;
  authorId: string | null;
  authorName: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateKnowledgeArticleInput = {
  title: string;
  content: string;
};
