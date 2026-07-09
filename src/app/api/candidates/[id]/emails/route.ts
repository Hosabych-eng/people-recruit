import prisma from "@/lib/prisma";
import { getCandidateOrThrow } from "@/lib/api/helpers";
import { ApiError, errorResponse, jsonResponse, parseJsonBody } from "@/lib/api/response";
import { parseSendCandidateEmailBody } from "@/lib/api/validation";
import { requireSessionUser } from "@/lib/auth/server";
import {
  compileEmailTemplate,
  plainTextToHtml,
} from "@/lib/email-template-compile";
import { prepareTrackedHtml } from "@/lib/email-tracking";
import { sendGmailMessage } from "@/lib/google/gmail";
import { getAuthenticatedGoogleClient } from "@/lib/google/oauth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function serializeEmailMessage(message: {
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
  isRead: boolean;
  isClicked: boolean;
  openedAt: Date | null;
  clickedAt: Date | null;
  sentAt: Date;
  createdAt: Date;
}) {
  return {
    id: message.id,
    candidateId: message.candidateId,
    interviewId: message.interviewId,
    direction: message.direction,
    status: message.status,
    senderName: message.senderName,
    senderEmail: message.senderEmail,
    recipientName: message.recipientName,
    recipientEmail: message.recipientEmail,
    ccEmails: message.ccEmails,
    subject: message.subject,
    body: message.body,
    isRead: message.isRead,
    isClicked: message.isClicked,
    openedAt: message.openedAt?.toISOString() ?? null,
    clickedAt: message.clickedAt?.toISOString() ?? null,
    sentAt: message.sentAt.toISOString(),
    createdAt: message.createdAt.toISOString(),
  };
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

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const input = parseSendCandidateEmailBody(body);

    const templateContext = {
      candidateName: candidate.name,
      jobTitle: candidate.job.title,
      recruiterName: session.name,
    };

    const subject = compileEmailTemplate(input.subject, templateContext);
    const messageBody = compileEmailTemplate(input.body, templateContext);

    const emailMessage = await prisma.emailMessage.create({
      data: {
        candidateId: candidate.id,
        direction: "OUTBOUND",
        status: "QUEUED",
        senderName: session.name,
        senderEmail: session.email,
        recipientName: candidate.name,
        recipientEmail: candidateEmail,
        ccEmails: input.cc.length > 0 ? input.cc.join(", ") : null,
        subject,
        body: messageBody,
      },
    });

    const htmlBody = prepareTrackedHtml(plainTextToHtml(messageBody), emailMessage.id);
    const googleAuth = await getAuthenticatedGoogleClient(session.id);

    let deliveryStatus: "SENT" | "FAILED" = "FAILED";
    let providerId: string | null = null;

    try {
      providerId = await sendGmailMessage({
        auth: googleAuth,
        from: session.email,
        fromName: session.name,
        to: candidateEmail,
        cc: input.cc,
        subject,
        text: messageBody,
        html: htmlBody,
      });
      deliveryStatus = providerId ? "SENT" : "FAILED";
    } catch (sendError) {
      console.error("[gmail] candidate email failed", sendError);
    }

    const updated = await prisma.emailMessage.update({
      where: { id: emailMessage.id },
      data: {
        status: deliveryStatus,
        providerId,
        sentAt: deliveryStatus === "SENT" ? new Date() : undefined,
      },
    });

    if (deliveryStatus === "SENT") {
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { emailsSent: { increment: 1 } },
      });
    }

    return jsonResponse(serializeEmailMessage(updated), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
