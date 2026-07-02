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
  subject: string;
  text: string;
  html: string;
  attachment?: GmailAttachment;
};

function encodeMimeMessage(raw: string) {
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
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

export async function sendGmailMessage(input: SendGmailMessageInput) {
  const gmail = google.gmail({ version: "v1", auth: input.auth });
  const fromHeader = input.fromName
    ? `${input.fromName} <${input.from}>`
    : input.from;

  let mimeMessage: string;

  if (input.attachment) {
    const mixedBoundary = `mixed_${Date.now()}`;
    const altBoundary = `alt_${Date.now()}`;
    const attachmentBase64 = input.attachment.content.toString("base64");

    mimeMessage = [
      `From: ${fromHeader}`,
      `To: ${input.to}`,
      `Subject: ${encodeHeaderValue(input.subject)}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
      "",
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      "",
      buildAlternativePart(altBoundary, input.text, input.html),
      `--${mixedBoundary}`,
      `Content-Type: ${input.attachment.mimeType}; name="${input.attachment.fileName}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${input.attachment.fileName}"`,
      "",
      attachmentBase64,
      `--${mixedBoundary}--`,
    ].join("\r\n");
  } else {
    const boundary = `interview_${Date.now()}`;
    mimeMessage = [
      `From: ${fromHeader}`,
      `To: ${input.to}`,
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
