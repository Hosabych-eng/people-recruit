import { getCandidateOrThrow } from "@/lib/api/helpers";
import { errorResponse, jsonResponse } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

type HistoryAuthor = {
  id: string | null;
  name: string;
  email: string | null;
  photoUrl: string | null;
};

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
  author: HistoryAuthor;
};

const WORKFORCE_LABELS: Record<string, string> = {
  RECRUITING_IN: "Додано до рекрутингу",
  RECRUITING_OUT: "Відмова / вихід з рекрутингу",
  ONBOARDING: "Онбординг",
  OFFBOARDING: "Офбординг",
};

const SYSTEM_AUTHOR: HistoryAuthor = {
  id: null,
  name: "Система",
  email: null,
  photoUrl: null,
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    const candidate = await getCandidateOrThrow(id, session);

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
          include: {
            emailMessages: {
              where: { direction: "OUTBOUND" },
              orderBy: { sentAt: "asc" },
              take: 1,
              select: {
                senderName: true,
                senderEmail: true,
              },
            },
          },
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

    const userIds = [
      ...notes.map((note) => note.authorId),
      ...testAssignments.map((row) => row.sentById),
      candidate.recruiterId,
    ].filter((value): value is string => Boolean(value));

    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: [...new Set(userIds)] } },
          select: { id: true, name: true, email: true, image: true },
        })
      : [];

    const usersById = new Map(users.map((user) => [user.id, user]));

    const authorFromUserId = (
      userId: string | null | undefined,
      fallbackName?: string | null,
    ): HistoryAuthor => {
      if (userId) {
        const user = usersById.get(userId);
        if (user) {
          return {
            id: user.id,
            name: user.name?.trim() || user.email || fallbackName || "Рекрутер",
            email: user.email,
            photoUrl: user.image,
          };
        }
      }
      if (fallbackName?.trim()) {
        return {
          id: userId ?? null,
          name: fallbackName.trim(),
          email: null,
          photoUrl: null,
        };
      }
      return SYSTEM_AUTHOR;
    };

    const recruiterAuthor = authorFromUserId(candidate.recruiterId);

    const entries: HistoryEntry[] = [
      ...notes.map((note) => ({
        id: `note-${note.id}`,
        type: "note" as const,
        title: "Коментар рекрутера",
        detail: note.content,
        occurredAt: note.createdAt.toISOString(),
        author: {
          id: note.authorId,
          name: note.authorName,
          email: note.authorId
            ? (usersById.get(note.authorId)?.email ?? null)
            : null,
          photoUrl: note.authorPhotoUrl,
        },
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
        author: {
          id: null,
          name: message.senderName,
          email: message.senderEmail,
          photoUrl: null,
        },
      })),
      ...interviews.map((interview) => {
        const invite = interview.emailMessages[0];
        return {
          id: `interview-${interview.id}`,
          type: "interview" as const,
          title: interview.title,
          detail: `${interview.status} · ${interview.type}`,
          occurredAt: interview.scheduledAt.toISOString(),
          author: invite
            ? {
                id: null,
                name: invite.senderName,
                email: invite.senderEmail,
                photoUrl: null,
              }
            : recruiterAuthor,
        };
      }),
      ...applications.map((application) => ({
        id: `application-${application.id}`,
        type: "application" as const,
        title: `Заявка: ${application.job.title}`,
        detail: `Етап: ${application.stage.name}`,
        occurredAt: application.createdAt.toISOString(),
        author: recruiterAuthor,
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
        author: authorFromUserId(assignment.sentById, assignment.sentByName),
      })),
      ...workforceEvents.map((event) => ({
        id: `workforce-${event.id}`,
        type: "workforce" as const,
        title: WORKFORCE_LABELS[event.type] ?? event.type,
        detail: event.note ?? event.jobTitle,
        occurredAt: event.occurredAt.toISOString(),
        author: SYSTEM_AUTHOR,
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
