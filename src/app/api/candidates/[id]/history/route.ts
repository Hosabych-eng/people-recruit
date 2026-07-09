import { getCandidateOrThrow } from "@/lib/api/helpers";
import { errorResponse, jsonResponse } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

type HistoryEntry = {
  id: string;
  type:
    | "note"
    | "email"
    | "interview"
    | "application"
    | "test-assignment"
    | "workforce";
  title: string;
  detail?: string | null;
  occurredAt: string;
};

const WORKFORCE_LABELS: Record<string, string> = {
  RECRUITING_IN: "Додано до рекрутингу",
  RECRUITING_OUT: "Відмова / вихід з рекрутингу",
  ONBOARDING: "Онбординг",
  OFFBOARDING: "Офбординг",
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getCandidateOrThrow(id, session);

    const [notes, emails, interviews, applications, testAssignments, workforceEvents] =
      await Promise.all([
        prisma.candidateNote.findMany({
          where: { candidateId: id },
          orderBy: { createdAt: "desc" },
        }),
        prisma.emailMessage.findMany({
          where: { candidateId: id },
          orderBy: { sentAt: "desc" },
        }),
        prisma.interview.findMany({
          where: { candidateId: id },
          orderBy: { scheduledAt: "desc" },
        }),
        prisma.candidateApplication.findMany({
          where: { candidateId: id },
          include: {
            job: { select: { title: true } },
            stage: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.candidateTestAssignment.findMany({
          where: { candidateId: id },
          include: { template: { select: { title: true } } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.workforceEvent.findMany({
          where: { candidateId: id },
          orderBy: { occurredAt: "desc" },
        }),
      ]);

    const entries: HistoryEntry[] = [
      ...notes.map((note) => ({
        id: `note-${note.id}`,
        type: "note" as const,
        title: "Коментар рекрутера",
        detail: note.content,
        occurredAt: note.createdAt.toISOString(),
      })),
      ...emails.map((message) => ({
        id: `email-${message.id}`,
        type: "email" as const,
        title:
          message.direction === "OUTBOUND"
            ? `Лист: ${message.subject}`
            : `Вхідний лист: ${message.subject}`,
        detail: message.body.slice(0, 280),
        occurredAt: message.sentAt.toISOString(),
      })),
      ...interviews.map((interview) => ({
        id: `interview-${interview.id}`,
        type: "interview" as const,
        title: interview.title,
        detail: `${interview.status} · ${interview.type}`,
        occurredAt: interview.scheduledAt.toISOString(),
      })),
      ...applications.map((application) => ({
        id: `application-${application.id}`,
        type: "application" as const,
        title: `Заявка: ${application.job.title}`,
        detail: `Етап: ${application.stage.name}`,
        occurredAt: application.createdAt.toISOString(),
      })),
      ...testAssignments.map((assignment) => ({
        id: `test-${assignment.id}`,
        type: "test-assignment" as const,
        title: `Тестове завдання: ${assignment.template.title}`,
        detail:
          assignment.status === "SUBMITTED"
            ? `Надіслано${assignment.submissionNote ? ` · ${assignment.submissionNote}` : ""}`
            : assignment.status,
        occurredAt: (assignment.submittedAt ?? assignment.createdAt).toISOString(),
      })),
      ...workforceEvents.map((event) => ({
        id: `workforce-${event.id}`,
        type: "workforce" as const,
        title: WORKFORCE_LABELS[event.type] ?? event.type,
        detail: event.note ?? event.jobTitle,
        occurredAt: event.occurredAt.toISOString(),
      })),
    ].sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
    );

    return jsonResponse(entries);
  } catch (error) {
    return errorResponse(error);
  }
}
