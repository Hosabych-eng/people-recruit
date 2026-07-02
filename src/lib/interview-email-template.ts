export type InterviewInvitationTemplateInput = {
  candidateName: string;
  jobTitle: string;
  interviewTitle: string;
  scheduledAt: Date;
  durationMinutes: number;
  recruiterName: string;
  meetingLink?: string;
};

function formatInterviewDate(date: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatInterviewTime(date: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "shortOffset",
  }).format(date);
}

export function buildInterviewInvitationSubject(input: InterviewInvitationTemplateInput) {
  return `Запрошення на онлайн-інтерв'ю: ${input.interviewTitle} — ${input.jobTitle}`;
}

export function buildInterviewInvitationBody(input: InterviewInvitationTemplateInput) {
  const meetingLine = input.meetingLink
    ? `Посилання на зустріч: ${input.meetingLink}`
    : "Посилання на зустріч буде надіслано за 24 години до початку.";

  return [
    `Вітаємо, ${input.candidateName}!`,
    "",
    `Вас запрошено на онлайн-інтерв'ю «${input.interviewTitle}» на позицію ${input.jobTitle}.`,
    "",
    `Дата: ${formatInterviewDate(input.scheduledAt)}`,
    `Час: ${formatInterviewTime(input.scheduledAt)} (тривалість ${input.durationMinutes} хв)`,
    `Формат: Онлайн`,
    "",
    meetingLine,
    "",
    "Будь ласка, підтвердіть свою участь, відповівши на цей лист.",
    "",
    "З повагою,",
    input.recruiterName,
  ].join("\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildInterviewInvitationHtml(input: InterviewInvitationTemplateInput) {
  const meetingLine = input.meetingLink
    ? `<a href="${escapeHtml(input.meetingLink)}">${escapeHtml(input.meetingLink)}</a>`
    : "Посилання на зустріч буде надіслано за 24 години до початку.";

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <p>Вітаємо, <strong>${escapeHtml(input.candidateName)}</strong>!</p>
      <p>
        Вас запрошено на онлайн-інтерв'ю
        <strong>«${escapeHtml(input.interviewTitle)}»</strong>
        на позицію <strong>${escapeHtml(input.jobTitle)}</strong>.
      </p>
      <ul style="padding-left: 1.25rem;">
        <li><strong>Дата:</strong> ${escapeHtml(formatInterviewDate(input.scheduledAt))}</li>
        <li><strong>Час:</strong> ${escapeHtml(formatInterviewTime(input.scheduledAt))} (тривалість ${input.durationMinutes} хв)</li>
        <li><strong>Формат:</strong> Онлайн</li>
      </ul>
      <p>${meetingLine}</p>
      <p>Будь ласка, підтвердіть свою участь, відповівши на цей лист.</p>
      <p>З повагою,<br />${escapeHtml(input.recruiterName)}</p>
    </div>
  `.trim();
}

export function buildInterviewInvitationPreview(input: InterviewInvitationTemplateInput) {
  return {
    subject: buildInterviewInvitationSubject(input),
    body: buildInterviewInvitationBody(input),
    placeholders: [
      "[Candidate Name]",
      "[Job Title]",
      "[Interview Title]",
      "[Date]",
      "[Time]",
      "[Recruiter Name]",
    ],
  };
}
