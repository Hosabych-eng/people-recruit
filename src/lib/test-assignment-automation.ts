import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { getCandidateOrThrow } from "@/lib/api/helpers";
import { sendGmailMessage } from "@/lib/google/gmail";
import { getAuthenticatedGoogleClient } from "@/lib/google/oauth";
import { readStoredFile, saveUploadedFile } from "@/lib/file-storage";
import {
  buildTestAssignmentBody,
  buildTestAssignmentHtml,
  buildTestAssignmentSubject,
} from "@/lib/test-assignment-email";
import { syncCandidateApplication } from "@/lib/settings/defaults";

const UPLOAD_LINK_TTL_DAYS = 14;

export function isTestAssignmentStageName(name: string) {
  return /test\s*assignment|тестов[аеі]\s*завдан/i.test(name);
}

export function isTestReviewStageName(name: string) {
  return /test\s*review|перевірка\s*тест|review\s*test/i.test(name);
}

function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function sendTestAssignmentToCandidate(input: {
  candidateId: string;
  templateId: string;
  sentById: string;
  sentByName: string;
  sentByEmail: string;
  withUploadLink?: boolean;
}) {
  const candidate = await getCandidateOrThrow(input.candidateId);
  const candidateEmail = candidate.email?.trim();
  if (!candidateEmail) {
    throw new Error("Candidate does not have a valid email address");
  }

  const template = await prisma.testAssignmentTemplate.findUnique({
    where: { id: input.templateId },
  });
  if (!template) {
    throw new Error("Test assignment template not found");
  }

  const uploadToken = input.withUploadLink ? randomUUID() : null;
  const uploadExpiresAt = uploadToken
    ? new Date(Date.now() + UPLOAD_LINK_TTL_DAYS * 24 * 60 * 60 * 1000)
    : null;
  const uploadUrl = uploadToken
    ? `${getAppBaseUrl()}/test-assignments/submit/${uploadToken}`
    : undefined;

  const assignment = await prisma.candidateTestAssignment.create({
    data: {
      candidateId: candidate.id,
      templateId: template.id,
      sentById: input.sentById,
      sentByName: input.sentByName,
      status: "QUEUED",
      uploadToken,
      uploadExpiresAt,
    },
    include: { template: true },
  });

  const googleAuth = await getAuthenticatedGoogleClient(input.sentById);
  const emailInput = {
    candidateName: candidate.name,
    jobTitle: candidate.job.title,
    templateTitle: template.title,
    recruiterName: input.sentByName,
    uploadUrl,
  };

  let status: "SENT" | "FAILED" = "FAILED";
  let gmailMessageId: string | null = null;

  try {
    const attachment = await readStoredFile(template.filePath);
    gmailMessageId = await sendGmailMessage({
      auth: googleAuth,
      from: input.sentByEmail,
      fromName: input.sentByName,
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
  } catch (error) {
    console.error("[test-assignment] send failed", error);
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

  return updated;
}

export async function maybeTriggerTestAssignmentAutomation(input: {
  candidateId: string;
  stageId: string;
  actorUserId: string;
  actorName: string;
  actorEmail: string;
}) {
  const stage = await prisma.stage.findUnique({ where: { id: input.stageId } });
  if (!stage) return null;
  if (!isTestAssignmentStageName(stage.name) && !stage.automationEnabled) {
    return null;
  }
  if (!isTestAssignmentStageName(stage.name)) {
    return null;
  }

  const pending = await prisma.candidateTestAssignment.findFirst({
    where: {
      candidateId: input.candidateId,
      status: { in: ["QUEUED", "SENT"] },
      submittedAt: null,
    },
  });
  if (pending) return pending;

  const template = await prisma.testAssignmentTemplate.findFirst({
    orderBy: { createdAt: "desc" },
  });
  if (!template) return null;

  return sendTestAssignmentToCandidate({
    candidateId: input.candidateId,
    templateId: template.id,
    sentById: input.actorUserId,
    sentByName: input.actorName,
    sentByEmail: input.actorEmail,
    withUploadLink: true,
  });
}

async function moveCandidateToTestReview(candidateId: string, jobId: string) {
  const reviewStage = await prisma.stage.findFirst({
    where: {
      jobId,
      OR: [
        { name: { contains: "Test Review", mode: "insensitive" } },
        { name: { contains: "перевірка", mode: "insensitive" } },
        { name: { contains: "review", mode: "insensitive" } },
      ],
    },
  });

  if (!reviewStage) return;

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { stageId: reviewStage.id },
  });
  await syncCandidateApplication(candidateId, jobId, reviewStage.id);
}

export async function submitTestAssignmentByToken(input: {
  token: string;
  file?: File | null;
  submissionLink?: string | null;
}) {
  const assignment = await prisma.candidateTestAssignment.findFirst({
    where: { uploadToken: input.token },
    include: { candidate: true, template: true },
  });

  if (!assignment) {
    throw new Error("Invalid or expired upload link");
  }

  if (assignment.uploadExpiresAt && assignment.uploadExpiresAt < new Date()) {
    throw new Error("Upload link has expired");
  }

  if (assignment.submittedAt) {
    throw new Error("Test assignment already submitted");
  }

  if (!input.file && !input.submissionLink?.trim()) {
    throw new Error("Upload a file or provide a submission link");
  }

  if (input.file) {
    const saved = await saveUploadedFile("candidate-documents", input.file, {
      candidateId: assignment.candidateId,
    });
    await prisma.candidateDocument.create({
      data: {
        candidateId: assignment.candidateId,
        category: "OTHER",
        title: `Test submission: ${assignment.template.title}`,
        fileName: saved.fileName,
        filePath: saved.filePath,
        mimeType: saved.mimeType,
        fileSize: saved.fileSize,
        uploadedByName: assignment.candidate.name,
      },
    });
  }

  await prisma.candidateTestAssignment.update({
    where: { id: assignment.id },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      submissionNote: input.submissionLink?.trim() || null,
    },
  });

  await moveCandidateToTestReview(assignment.candidateId, assignment.candidate.jobId);

  return assignment;
}

export async function getTestAssignmentByToken(token: string) {
  const assignment = await prisma.candidateTestAssignment.findFirst({
    where: { uploadToken: token },
    include: {
      candidate: { select: { name: true } },
      template: { select: { title: true } },
    },
  });

  if (!assignment) return null;

  return {
    candidateName: assignment.candidate.name,
    templateTitle: assignment.template.title,
    expiresAt: assignment.uploadExpiresAt?.toISOString() ?? null,
    submittedAt: assignment.submittedAt?.toISOString() ?? null,
    expired: Boolean(assignment.uploadExpiresAt && assignment.uploadExpiresAt < new Date()),
  };
}
