import prisma from "@/lib/prisma";
import { getGmailMessage, listRecentInboundMessages } from "@/lib/google/gmail";
import { getAuthenticatedGoogleClient } from "@/lib/google/oauth";
import { normalizeEmail } from "@/lib/candidates/import-parser";

const GMAIL_CURSOR_PREFIX = "gmail.history.";

async function getCursor(userId: string) {
  const row = await prisma.integrationState.findUnique({
    where: { key: `${GMAIL_CURSOR_PREFIX}${userId}` },
  });
  return row?.value ?? null;
}

async function setCursor(userId: string, value: string) {
  await prisma.integrationState.upsert({
    where: { key: `${GMAIL_CURSOR_PREFIX}${userId}` },
    create: { key: `${GMAIL_CURSOR_PREFIX}${userId}`, value },
    update: { value },
  });
}

export async function syncInboundGmailForUser(userId: string) {
  const auth = await getAuthenticatedGoogleClient(userId);
  const recruiterEmail = (
    await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
  )?.email;

  const messages = await listRecentInboundMessages(auth, { maxResults: 40 });
  const lastCursor = await getCursor(userId);
  let newestId = lastCursor;
  let imported = 0;

  for (const message of messages) {
    if (!message.id) continue;
    if (lastCursor && message.id <= lastCursor) continue;

    const parsed = await getGmailMessage(auth, message.id);
    const senderEmail = normalizeEmail(parsed.fromEmail);
    if (!senderEmail) continue;

    if (recruiterEmail && senderEmail === normalizeEmail(recruiterEmail)) {
      continue;
    }

    const existing = await prisma.emailMessage.findFirst({
      where: { providerId: parsed.id },
    });
    if (existing) continue;

    const candidate = await prisma.candidate.findFirst({
      where: { email: { equals: senderEmail, mode: "insensitive" } },
      orderBy: { updatedAt: "desc" },
    });
    if (!candidate) continue;

    await prisma.emailMessage.create({
      data: {
        candidateId: candidate.id,
        direction: "INBOUND",
        status: "RECEIVED",
        senderName: parsed.fromName,
        senderEmail: senderEmail,
        recipientName: recruiterEmail ?? "Recruiter",
        recipientEmail: recruiterEmail ?? parsed.toEmail,
        subject: parsed.subject,
        body: parsed.body || "(empty message)",
        providerId: parsed.id,
        sentAt: parsed.receivedAt,
        isRead: false,
      },
    });

    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { emailsReceived: { increment: 1 } },
    });

    imported += 1;
    if (!newestId || message.id > newestId) {
      newestId = message.id;
    }
  }

  if (newestId && newestId !== lastCursor) {
    await setCursor(userId, newestId);
  }

  return { imported, cursor: newestId };
}

export async function syncInboundGmailForAllUsers() {
  const accounts = await prisma.account.findMany({
    where: { provider: "google" },
    select: { userId: true },
    distinct: ["userId"],
  });

  const results = [];
  for (const account of accounts) {
    try {
      results.push({
        userId: account.userId,
        ...(await syncInboundGmailForUser(account.userId)),
      });
    } catch (error) {
      results.push({
        userId: account.userId,
        imported: 0,
        error: error instanceof Error ? error.message : "sync failed",
      });
    }
  }

  return results;
}
