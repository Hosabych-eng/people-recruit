import type { InterviewStatus, InterviewType } from "@prisma/client";
import type { getCandidateProfile } from "@/lib/candidates/profile";
import type { CandidateProfile } from "@/types";
import { serializeCandidateDocument, serializeCandidateTestAssignment } from "@/lib/test-assignments";

export type CandidateProfileTab =
  | "home"
  | "offers"
  | "interviews"
  | "emails"
  | "test-assignments"
  | "documents"
  | "history";

export const PROFILE_TABS: { id: CandidateProfileTab; label: string }[] = [
  { id: "home", label: "Головна" },
  { id: "offers", label: "Пропозиції" },
  { id: "interviews", label: "Інтерв'ю" },
  { id: "emails", label: "Електронні листи" },
  { id: "test-assignments", label: "Тестові завдання" },
  { id: "documents", label: "Документи" },
  { id: "history", label: "Історія" },
];

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  PENDING: "Заплановано",
  COMPLETED: "Завершено",
  CANCELLED: "Скасовано",
};

export const INTERVIEW_STATUS_STYLES: Record<InterviewStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  ONLINE: "Онлайн",
  ONSITE: "Офіс",
  PHONE: "Телефон",
};

export function serializeCandidateProfile(
  candidate: Awaited<ReturnType<typeof getCandidateProfile>>,
): CandidateProfile {
  return {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    resumeLink: candidate.resumeLink,
    applicationSource: candidate.applicationSource,
    isNew: candidate.isNew,
    createdAt: candidate.createdAt.toISOString(),
    stage: { id: candidate.stage.id, name: candidate.stage.name },
    job: { id: candidate.job.id, title: candidate.job.title },
    notes: candidate.candidateNotes.map((note) => ({
      id: note.id,
      content: note.content,
      candidateId: note.candidateId,
      authorId: note.authorId,
      authorName: note.authorName,
      authorRole: note.authorRole,
      authorPhotoUrl: note.authorPhotoUrl,
      createdAt: note.createdAt.toISOString(),
    })),
    interviews: candidate.interviews.map((interview) => ({
      id: interview.id,
      candidateId: interview.candidateId,
      title: interview.title,
      status: interview.status,
      scheduledAt: interview.scheduledAt.toISOString(),
      type: interview.type,
      durationMinutes: interview.durationMinutes,
      messageBody: interview.messageBody,
      createdAt: interview.createdAt.toISOString(),
      updatedAt: interview.updatedAt.toISOString(),
    })),
    emails: candidate.emailMessages.map((message) => ({
      id: message.id,
      candidateId: message.candidateId,
      interviewId: message.interviewId,
      direction: message.direction,
      status: message.status,
      senderName: message.senderName,
      senderEmail: message.senderEmail,
      recipientName: message.recipientName,
      recipientEmail: message.recipientEmail,
      subject: message.subject,
      body: message.body,
      sentAt: message.sentAt.toISOString(),
      createdAt: message.createdAt.toISOString(),
    })),
    testAssignments: candidate.testAssignments.map(serializeCandidateTestAssignment),
    documents: candidate.documents.map(serializeCandidateDocument),
  };
}
