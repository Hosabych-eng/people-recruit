import { google } from "googleapis";
import type { GoogleOAuth2Client } from "@/lib/google/oauth";

type GmailAttachment = {
  fileName: string;
  mimeType: string;
  content: Buffer;
};

type SendGmailMessageInput = {
  auth: GoogleOAuth2Client;
  from: string;
  fromName?: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html: string;
  /** @deprecated Prefer `attachments` for multiple files. Kept for callers. */
  attachment?: GmailAttachment;
  attachments?: GmailAttachment[];
};

export type ParsedGmailMessage = {
  id: string;
  threadId?: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  subject: string;
  body: string;
  receivedAt: Date;
};

function encodeMimeMessage(raw: string) {
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeBase64Url(data: string) {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function encodeHeaderValue(value: string) {
  return `=?UTF-8?B?${Buffer.from(value).toString("base64")}?=`;
}

function buildAlternativePart(boundary: string, text: string, html: string) {
  return [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    text,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    html,
    `--${boundary}--`,
  ].join("\r\n");
}

function parseAddressHeader(value: string) {
  const match = value.match(/^(?:"?([^"]*)"?\s)?<?([^>]+@[^>]+)>?$/);
  return {
    name: match?.[1]?.trim() || match?.[2]?.trim() || value,
    email: (match?.[2] ?? value).trim().toLowerCase(),
  };
}

function extractBodyFromPayload(
  payload: { mimeType?: string | null; body?: { data?: string | null }; parts?: unknown[] } | undefined,
): string {
  if (!payload) return "";

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  const parts = (payload.parts ?? []) as {
    mimeType?: string;
    body?: { data?: string };
    parts?: unknown[];
  }[];

  const plain = parts.find((part) => part.mimeType === "text/plain");
  if (plain?.body?.data) {
    return decodeBase64Url(plain.body.data);
  }

  const html = parts.find((part) => part.mimeType === "text/html");
  if (html?.body?.data) {
    return decodeBase64Url(html.body.data).replace(/<[^>]+>/g, " ");
  }

  for (const part of parts) {
    const nested = extractBodyFromPayload(part);
    if (nested.trim()) return nested;
  }

  return "";
}

export async function sendGmailMessage(input: SendGmailMessageInput) {
  const gmail = google.gmail({ version: "v1", auth: input.auth });
  const fromHeader = input.fromName
    ? `${input.fromName} <${input.from}>`
    : input.from;

  const attachments =
    input.attachments && input.attachments.length > 0
      ? input.attachments
      : input.attachment
        ? [input.attachment]
        : [];

  const ccLine =
    input.cc && input.cc.length > 0 ? [`Cc: ${input.cc.join(", ")}`] : [];
  const bccLine =
    input.bcc && input.bcc.length > 0 ? [`Bcc: ${input.bcc.join(", ")}`] : [];

  let mimeMessage: string;

  if (attachments.length > 0) {
    const mixedBoundary = `mixed_${Date.now()}`;
    const altBoundary = `alt_${Date.now()}`;
    const attachmentParts = attachments.flatMap((file) => [
      `--${mixedBoundary}`,
      `Content-Type: ${file.mimeType}; name="${file.fileName}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${file.fileName}"`,
      "",
      file.content.toString("base64"),
    ]);

    mimeMessage = [
      `From: ${fromHeader}`,
      `To: ${input.to}`,
      ...ccLine,
      ...bccLine,
      `Subject: ${encodeHeaderValue(input.subject)}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
      "",
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      "",
      buildAlternativePart(altBoundary, input.text, input.html),
      ...attachmentParts,
      `--${mixedBoundary}--`,
    ].join("\r\n");
  } else {
    const boundary = `interview_${Date.now()}`;
    mimeMessage = [
      `From: ${fromHeader}`,
      `To: ${input.to}`,
      ...ccLine,
      ...bccLine,
      `Subject: ${encodeHeaderValue(input.subject)}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      buildAlternativePart(boundary, input.text, input.html),
    ].join("\r\n");
  }

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodeMimeMessage(mimeMessage),
    },
  });

  return response.data.id ?? null;
}

export async function listRecentInboundMessages(
  auth: GoogleOAuth2Client,
  options?: { maxResults?: number; query?: string },
) {
  const gmail = google.gmail({ version: "v1", auth });
  const response = await gmail.users.messages.list({
    userId: "me",
    maxResults: options?.maxResults ?? 25,
    q: options?.query ?? "is:inbox newer_than:14d",
  });

  return response.data.messages ?? [];
}

export async function getGmailMessage(auth: GoogleOAuth2Client, messageId: string) {
  const gmail = google.gmail({ version: "v1", auth });
  const response = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const headers = response.data.payload?.headers ?? [];
  const getHeader = (name: string) =>
    headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

  const from = parseAddressHeader(getHeader("From"));
  const to = parseAddressHeader(getHeader("To"));
  const internalDate = response.data.internalDate
    ? new Date(Number(response.data.internalDate))
    : new Date();

  return {
    id: response.data.id ?? messageId,
    threadId: response.data.threadId ?? undefined,
    fromEmail: from.email,
    fromName: from.name,
    toEmail: to.email,
    subject: getHeader("Subject") || "(no subject)",
    body: extractBodyFromPayload(response.data.payload).trim(),
    receivedAt: internalDate,
  } satisfies ParsedGmailMessage;
}
