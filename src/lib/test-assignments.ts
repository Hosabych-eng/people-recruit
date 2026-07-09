import prisma from "@/lib/prisma";

export async function listTestAssignmentTemplates() {
  return prisma.testAssignmentTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export function serializeTestAssignmentTemplate(template: {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedByName: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: template.id,
    title: template.title,
    description: template.description,
    fileName: template.fileName,
    mimeType: template.mimeType,
    fileSize: template.fileSize,
    uploadedByName: template.uploadedByName,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export function serializeCandidateTestAssignment(assignment: {
  id: string;
  candidateId: string;
  templateId: string;
  sentByName: string;
  status: "QUEUED" | "SENT" | "FAILED" | "SUBMITTED";
  gmailMessageId: string | null;
  uploadToken?: string | null;
  uploadExpiresAt?: Date | null;
  submittedAt?: Date | null;
  submissionNote?: string | null;
  sentAt: Date | null;
  createdAt: Date;
  template: {
    id: string;
    title: string;
    fileName: string;
  };
}) {
  return {
    id: assignment.id,
    candidateId: assignment.candidateId,
    templateId: assignment.templateId,
    templateTitle: assignment.template.title,
    templateFileName: assignment.template.fileName,
    sentByName: assignment.sentByName,
    status: assignment.status,
    gmailMessageId: assignment.gmailMessageId,
    uploadExpiresAt: assignment.uploadExpiresAt?.toISOString() ?? null,
    submittedAt: assignment.submittedAt?.toISOString() ?? null,
    submissionNote: assignment.submissionNote ?? null,
    sentAt: assignment.sentAt?.toISOString() ?? null,
    createdAt: assignment.createdAt.toISOString(),
  };
}

export function serializeCandidateDocument(document: {
  id: string;
  candidateId: string;
  category: "RESUME" | "PORTFOLIO" | "OFFER" | "OTHER";
  title: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedByName: string;
  createdAt: Date;
}) {
  return {
    id: document.id,
    candidateId: document.candidateId,
    category: document.category,
    title: document.title,
    fileName: document.fileName,
    mimeType: document.mimeType,
    fileSize: document.fileSize,
    uploadedByName: document.uploadedByName,
    createdAt: document.createdAt.toISOString(),
  };
}
