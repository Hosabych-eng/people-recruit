import prisma from "@/lib/prisma";
import { getCandidateOrThrow } from "@/lib/api/helpers";
import { ApiError, errorResponse, jsonResponse } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import { sendGmailMessage } from "@/lib/google/gmail";
import { getAuthenticatedGoogleClient } from "@/lib/google/oauth";
import { readStoredFile } from "@/lib/file-storage";
import {
  buildTestAssignmentBody,
  buildTestAssignmentHtml,
  buildTestAssignmentSubject,
} from "@/lib/test-assignment-email";
import { serializeCandidateTestAssignment } from "@/lib/test-assignments";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireSessionUser();
    const { id } = await context.params;
    await getCandidateOrThrow(id);

    const assignments = await prisma.candidateTestAssignment.findMany({
      where: { candidateId: id },
      include: { template: true },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse(assignments.map(serializeCandidateTestAssignment));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    const candidate = await getCandidateOrThrow(id);
    const body = (await request.json()) as { templateId?: string };
    const templateId = body.templateId?.trim();

    if (!templateId) {
      throw new ApiError(400, "templateId is required");
    }

    const candidateEmail = candidate.email?.trim();
    if (!candidateEmail) {
      throw new ApiError(400, "Candidate does not have a valid email address");
    }

    const template = await prisma.testAssignmentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new ApiError(404, "Test assignment template not found");
    }

    const googleAuth = await getAuthenticatedGoogleClient(session.id);
    const emailInput = {
      candidateName: candidate.name,
      jobTitle: candidate.job.title,
      templateTitle: template.title,
      recruiterName: session.name,
    };

    const assignment = await prisma.candidateTestAssignment.create({
      data: {
        candidateId: candidate.id,
        templateId: template.id,
        sentById: session.id,
        sentByName: session.name,
        status: "QUEUED",
      },
      include: { template: true },
    });

    let status: "SENT" | "FAILED" = "FAILED";
    let gmailMessageId: string | null = null;

    try {
      const attachment = await readStoredFile(template.filePath);
      gmailMessageId = await sendGmailMessage({
        auth: googleAuth,
        from: session.email,
        fromName: session.name,
        to: candidateEmail,
        subject: buildTestAssignmentSubject(emailInput),
        text: buildTestAssignmentBody(emailInput),
        html: buildTestAssignmentHtml(emailInput),
        attachment: {
          fileName: template.fileName,
          mimeType: template.mimeType,
          content: attachment,
        },
      });
      status = gmailMessageId ? "SENT" : "FAILED";
    } catch (sendError) {
      console.error("[gmail] test assignment send failed", sendError);
    }

    const updated = await prisma.candidateTestAssignment.update({
      where: { id: assignment.id },
      data: {
        status,
        gmailMessageId,
        sentAt: status === "SENT" ? new Date() : undefined,
      },
      include: { template: true },
    });

    if (status === "SENT") {
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { emailsSent: { increment: 1 } },
      });
    }

    return jsonResponse(serializeCandidateTestAssignment(updated), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
