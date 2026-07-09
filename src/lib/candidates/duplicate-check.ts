import prisma from "@/lib/prisma";
import { serializeCandidateTestAssignment } from "@/lib/test-assignments";
import {
  normalizeEmail,
  normalizeProfileUrl,
} from "@/lib/candidates/import-parser";

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

const candidateInclude = {
  stage: true,
  job: {
    select: { id: true, title: true, status: true },
  },
} as const;

function normalizePhone(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 ? digits : null;
}

export async function findDuplicateCandidate(input: {
  email?: string;
  phone?: string;
  resumeLink?: string;
}) {
  const email = input.email ? normalizeEmail(input.email) : null;
  const phone = normalizePhone(input.phone);
  const profileUrl = input.resumeLink ? normalizeProfileUrl(input.resumeLink) : null;

  if (email) {
    const byEmail = await prisma.candidate.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      include: candidateInclude,
    });
    if (byEmail) return byEmail;
  }

  if (phone) {
    const withPhones = await prisma.candidate.findMany({
      where: { phone: { not: null } },
      include: candidateInclude,
    });
    const byPhone = withPhones.find(
      (candidate) => normalizePhone(candidate.phone) === phone,
    );
    if (byPhone) return byPhone;
  }

  if (!profileUrl) return null;

  const withProfiles = await prisma.candidate.findMany({
    where: { resumeLink: { not: null } },
    include: candidateInclude,
  });

  return (
    withProfiles.find(
      (candidate) =>
        candidate.resumeLink &&
        normalizeProfileUrl(candidate.resumeLink) === profileUrl,
    ) ?? null
  );
}

export async function getCandidateDuplicateHistory(
  candidateId: string,
): Promise<CandidateDuplicateHistory> {
  const [lastEmail, lastTestAssignment] = await Promise.all([
    prisma.emailMessage.findFirst({
      where: { candidateId, direction: "OUTBOUND" },
      orderBy: { sentAt: "desc" },
      select: {
        sentAt: true,
        status: true,
        subject: true,
      },
    }),
    prisma.candidateTestAssignment.findFirst({
      where: { candidateId },
      orderBy: { createdAt: "desc" },
      include: { template: true },
    }),
  ]);

  return {
    lastEmail: lastEmail
      ? {
          sentAt: lastEmail.sentAt.toISOString(),
          status: lastEmail.status,
          subject: lastEmail.subject,
        }
      : null,
    lastTestAssignment: lastTestAssignment
      ? {
          templateTitle: lastTestAssignment.template.title,
          status: lastTestAssignment.status,
          sentAt: lastTestAssignment.sentAt?.toISOString() ?? null,
        }
      : null,
  };
}

export { serializeCandidateTestAssignment };
