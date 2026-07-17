import type { Candidate, Job, JobStatus, Stage } from "@prisma/client";

export type { JobStatus };

export type StageWithCount = Stage & {
  _count: { candidates: number };
};

export type JobWithCounts = Job & {
  stages: { id: string; name: string }[];
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
  _count: { candidateNotes: number; documents?: number };
  tags?: CandidateTag[];
  skills?: string[];
  expectedSalary?: number | null;
  salaryCurrency?: string | null;
  isNew?: boolean;
  avatarUrl?: string | null;
  score?: number | null;
  evaluationAverage?: number | null;
  testAssignmentDeadline?: Date | string | null;
  resumeText?: string | null;
  rejectionReason?: RejectionReason | null;
  lastNote?: { content: string; createdAt: Date | string } | null;
};

export type RejectionReason = {
  id: string;
  name: string;
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
  rejectionReason?: RejectionReason | null;
  lastNote?: { content: string; createdAt: Date | string } | null;
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
  email: string | null;
  phone: string | null;
  resumeLink: string | null;
  expectedSalary: number | null;
  salaryCurrency: string | null;
  stageId: string;
  jobId: string;
  isNew: boolean;
  score: number | null;
  englishLevel: string | null;
  chineseLevel: string | null;
  position: string | null;
  coverLetter: string | null;
  rejectionReasonId: string | null;
  rejectionNote: string | null;
  location: string | null;
  telegram: string | null;
  offerLink: string | null;
  firstContactDate: string | null;
  lastContactDate: string | null;
  recruiterId: string | null;
}>;

export type CandidateTag = {
  id: string;
  name: string;
  color: string;
};

export type CandidateApplication = {
  id: string;
  candidateId: string;
  jobId: string;
  stageId: string;
  job: { id: string; title: string; status: string };
  stage: { id: string; name: string };
  createdAt: string;
};

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
  meetLink: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateInterviewInput = {
  title: string;
  scheduledAt: string;
  durationMinutes?: number;
  type?: "ONLINE" | "ONSITE" | "PHONE";
  emailSubject?: string;
  emailBody?: string;
  emailLanguage?: "UA" | "EN";
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
  ccEmails: string | null;
  subject: string;
  body: string;
  sentAt: string;
  createdAt: string;
  isRead: boolean;
  isClicked: boolean;
  openedAt: string | null;
  clickedAt: string | null;
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
  status: "QUEUED" | "SENT" | "FAILED" | "SUBMITTED";
  gmailMessageId: string | null;
  uploadExpiresAt?: string | null;
  submittedAt?: string | null;
  submissionNote?: string | null;
  sentAt: string | null;
  createdAt: string;
};

export type CandidateDocument = {
  id: string;
  candidateId: string;
  category: "RESUME" | "PORTFOLIO" | "OFFER" | "OTHER";
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
  avatarUrl?: string;
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
  cc?: string | string[];
  bcc?: string | string[];
  documentIds?: string[];
};

export type CandidateProfile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  resumeLink: string | null;
  avatarUrl: string | null;
  position: string | null;
  coverLetter: string | null;
  englishLevel: string | null;
  chineseLevel: string | null;
  score: number | null;
  applicationSource: string;
  isNew: boolean;
  createdAt: string;
  expectedSalary: number | null;
  salaryCurrency: string | null;
  location: string | null;
  telegram: string | null;
  offerLink: string | null;
  firstContactDate: string | null;
  lastContactDate: string | null;
  recruiterId: string | null;
  recruiter: { id: string; name: string | null; email: string | null; image: string | null } | null;
  stage: { id: string; name: string };
  job: { id: string; title: string; status: JobStatus };
  tags: CandidateTag[];
  applications: CandidateApplication[];
  notes: CandidateNote[];
  interviews: CandidateInterview[];
  emails: CandidateEmailMessage[];
  testAssignments: CandidateTestAssignment[];
  documents: CandidateDocument[];
  customFields: Record<string, string>;
  links: CandidateLink[];
  skills?: string[];
  evaluationAverage?: number | null;
  experienceYears?: number | null;
};

export type CandidateLink = {
  id: string;
  label: string;
  url: string;
  createdAt: string;
  updatedAt: string;
};

export type CandidateFieldSchemaItem = {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: "STANDARD" | "TEXT" | "DROPDOWN";
  visible: boolean;
  sortOrder: number;
  options: string[];
  isCustom: boolean;
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

export type TimeToHireAnalyticsResponse = {
  period: { from: string; to: string };
  disclaimer: string;
  summary: {
    avgTimeToHireDays: number | null;
    medianTimeToHireDays: number | null;
    hiredInPeriod: number;
    activeCandidates: number;
  };
  stageDwell: Array<{
    stage: string;
    orderInPipeline: number;
    candidateCount: number;
    avgDaysInCurrentStage: number;
    avgDaysInPipeline: number;
    avgDaysFromHistory: number | null;
  }>;
  hiresByMonth: Array<{ month: string; count: number }>;
  recentHires: Array<{
    candidateId: string;
    candidateName: string;
    daysToHire: number;
    hiredAt: string;
  }>;
};
