import prisma from "@/lib/prisma";
import { getCandidateOrThrow } from "@/lib/api/helpers";
import { ApiError, errorResponse, jsonResponse } from "@/lib/api/response";
import { parseCreateInterviewBody } from "@/lib/api/validation";
import { requireSessionUser } from "@/lib/auth/server";
import { prepareTrackedHtml } from "@/lib/email-tracking";
import { createInterviewCalendarEvent } from "@/lib/google/calendar";
import { sendGmailMessage } from "@/lib/google/gmail";
import { getAuthenticatedGoogleClient } from "@/lib/google/oauth";
import {
  buildInterviewInvitationBody,
  buildInterviewInvitationHtml,
  buildInterviewInvitationSubject,
} from "@/lib/interview-email-template";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function serializeInterview(interview: {
  id: string;
  candidateId: string;
  title: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  scheduledAt: Date;
  type: "ONLINE" | "ONSITE" | "PHONE";
  durationMinutes: number;
  messageBody: string | null;
  meetLink: string | null;
  calendarEventId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: interview.id,
    candidateId: interview.candidateId,
    title: interview.title,
    status: interview.status,
    scheduledAt: interview.scheduledAt.toISOString(),
    type: interview.type,
    durationMinutes: interview.durationMinutes,
    messageBody: interview.messageBody,
    meetLink: interview.meetLink,
    calendarEventId: interview.calendarEventId,
    createdAt: interview.createdAt.toISOString(),
    updatedAt: interview.updatedAt.toISOString(),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getCandidateOrThrow(id, session);

    const interviews = await prisma.interview.findMany({
      where: { candidateId: id },
      orderBy: { scheduledAt: "desc" },
    });

    return jsonResponse(interviews.map(serializeInterview));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    const candidate = await getCandidateOrThrow(id, session);

    const candidateEmail = candidate.email?.trim();
    if (!candidateEmail) {
      throw new ApiError(400, "Candidate does not have a valid email address");
    }

    const body = parseCreateInterviewBody(
      (await request.json()) as Record<string, unknown>,
    );

    if (body.type !== "ONLINE") {
      throw new ApiError(400, "Only ONLINE interviews are supported right now");
    }

    const googleAuth = await getAuthenticatedGoogleClient(session.id);

    const interview = await prisma.interview.create({
      data: {
        candidateId: candidate.id,
        title: body.title,
        scheduledAt: body.scheduledAt,
        type: body.type,
        durationMinutes: body.durationMinutes,
        status: "PENDING",
      },
    });

    let calendarEventId: string | null = null;
    let meetLink: string | null = null;

    try {
      const calendarDescription = [
        `Кандидат: ${candidate.name}`,
        `Вакансія: ${candidate.job.title}`,
      ].join("\n");

      const calendarResult = await createInterviewCalendarEvent({
        auth: googleAuth,
        summary: buildInterviewInvitationSubject({
          candidateName: candidate.name,
          jobTitle: candidate.job.title,
          interviewTitle: body.title,
          scheduledAt: body.scheduledAt,
          durationMinutes: body.durationMinutes,
          recruiterName: session.name,
        }),
        description: calendarDescription,
        scheduledAt: body.scheduledAt,
        durationMinutes: body.durationMinutes,
        attendeeEmail: candidateEmail,
        attendeeName: candidate.name,
        requestId: `interview-${interview.id}`,
      });

      calendarEventId = calendarResult.eventId;
      meetLink = calendarResult.meetLink;
    } catch (calendarError) {
      console.error("[calendar] interview event failed", calendarError);
    }

    const templateInput = {
      candidateName: candidate.name,
      jobTitle: candidate.job.title,
      interviewTitle: body.title,
      scheduledAt: body.scheduledAt,
      durationMinutes: body.durationMinutes,
      recruiterName: session.name,
      meetingLink: meetLink ?? undefined,
    };

    const subject = buildInterviewInvitationSubject(templateInput);
    const messageBody = buildInterviewInvitationBody(templateInput);
    const htmlBody = buildInterviewInvitationHtml(templateInput);

    const emailMessage = await prisma.emailMessage.create({
      data: {
        candidateId: candidate.id,
        interviewId: interview.id,
        direction: "OUTBOUND",
        status: "QUEUED",
        senderName: session.name,
        senderEmail: session.email,
        recipientName: candidate.name,
        recipientEmail: candidateEmail,
        subject,
        body: messageBody,
      },
    });

    const trackedHtml = prepareTrackedHtml(htmlBody, emailMessage.id);

    let deliveryStatus: "SENT" | "FAILED" = "FAILED";
    let providerId: string | null = null;

    try {
      providerId = await sendGmailMessage({
        auth: googleAuth,
        from: session.email,
        fromName: session.name,
        to: candidateEmail,
        subject,
        text: messageBody,
        html: trackedHtml,
      });
      deliveryStatus = providerId ? "SENT" : "FAILED";
    } catch (gmailError) {
      console.error("[gmail] interview invitation failed", gmailError);
    }

    const [savedInterview, savedEmail] = await prisma.$transaction(async (tx) => {
      const savedInterview = await tx.interview.update({
        where: { id: interview.id },
        data: {
          messageBody,
          meetLink,
          calendarEventId,
        },
      });

      const savedEmail = await tx.emailMessage.update({
        where: { id: emailMessage.id },
        data: {
          status: deliveryStatus,
          providerId,
          sentAt: deliveryStatus === "SENT" ? new Date() : undefined,
        },
      });

      if (deliveryStatus === "SENT") {
        await tx.candidate.update({
          where: { id: candidate.id },
          data: { emailsSent: { increment: 1 } },
        });
      }

      return [savedInterview, savedEmail] as const;
    });

    return jsonResponse(
      {
        ...serializeInterview(savedInterview),
        emailDelivery: {
          status: savedEmail.status,
          providerId: savedEmail.providerId,
        },
        calendarDelivery: {
          status: calendarEventId ? "SENT" : "FAILED",
          eventId: calendarEventId,
          meetLink,
        },
      },
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
