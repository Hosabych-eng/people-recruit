import {
  buildInterviewInvitationBody,
  buildInterviewInvitationSubject,
  formatInterviewDate,
  formatInterviewTime,
} from "@/lib/interview-email-template";

export type InterviewEmailLanguage = "UA" | "EN";

export type InterviewInvitationCompileContext = {
  candidateName: string;
  jobTitle: string;
  interviewTitle: string;
  scheduledAt: Date;
  durationMinutes: number;
  recruiterName: string;
  meetingLink?: string;
  language?: InterviewEmailLanguage;
};

export type BuiltinInterviewEmailTemplate = {
  id: string;
  title: string;
  subject: Record<InterviewEmailLanguage, string>;
  body: Record<InterviewEmailLanguage, string>;
};

/** Built-in invitation templates with placeholders for live compile. */
export const BUILTIN_INTERVIEW_EMAIL_TEMPLATES: BuiltinInterviewEmailTemplate[] = [
  {
    id: "standard",
    title: "Стандартне запрошення",
    subject: {
      UA: "Запрошення на онлайн-інтерв'ю: {{interview_title}} — {{job_title}}",
      EN: "Online interview invitation: {{interview_title}} — {{job_title}}",
    },
    body: {
      UA: [
        "Вітаємо, {{candidate_name}}!",
        "",
        "Вас запрошено на онлайн-інтерв'ю «{{interview_title}}» на позицію {{job_title}}.",
        "",
        "Дата: {{date}}",
        "Час: {{time}} (тривалість {{duration}} хв)",
        "Формат: Онлайн",
        "",
        "{{meeting_link}}",
        "",
        "Будь ласка, підтвердіть свою участь, відповівши на цей лист.",
        "",
        "З повагою,",
        "{{recruiter_name}}",
      ].join("\n"),
      EN: [
        "Hello, {{candidate_name}}!",
        "",
        "You are invited to an online interview «{{interview_title}}» for the {{job_title}} role.",
        "",
        "Date: {{date}}",
        "Time: {{time}} (duration {{duration}} min)",
        "Format: Online",
        "",
        "{{meeting_link}}",
        "",
        "Please confirm your participation by replying to this email.",
        "",
        "Best regards,",
        "{{recruiter_name}}",
      ].join("\n"),
    },
  },
  {
    id: "short",
    title: "Коротке запрошення",
    subject: {
      UA: "Інтерв'ю {{interview_title}} — {{date}}",
      EN: "Interview {{interview_title}} — {{date}}",
    },
    body: {
      UA: [
        "Привіт, {{candidate_name}}!",
        "",
        "Запрошуємо на «{{interview_title}}» ({{job_title}}).",
        "{{date}}, {{time}}, {{duration}} хв, онлайн.",
        "{{meeting_link}}",
        "",
        "{{recruiter_name}}",
      ].join("\n"),
      EN: [
        "Hi {{candidate_name}},",
        "",
        "You're invited to «{{interview_title}}» ({{job_title}}).",
        "{{date}}, {{time}}, {{duration}} min, online.",
        "{{meeting_link}}",
        "",
        "{{recruiter_name}}",
      ].join("\n"),
    },
  },
];

const PLACEHOLDER_PATTERN =
  /\{\{\s*(candidate_name|job_title|interview_title|date|time|duration|recruiter_name|meeting_link)\s*\}\}/gi;

function meetingLinkLine(meetingLink: string | undefined, language: InterviewEmailLanguage) {
  if (meetingLink) {
    return language === "EN"
      ? `Meeting link: ${meetingLink}`
      : `Посилання на зустріч: ${meetingLink}`;
  }
  return language === "EN"
    ? "The meeting link will be sent 24 hours before the interview."
    : "Посилання на зустріч буде надіслано за 24 години до початку.";
}

export function compileInterviewInvitationText(
  text: string,
  context: InterviewInvitationCompileContext,
) {
  const language = context.language ?? "UA";
  const date =
    language === "EN"
      ? new Intl.DateTimeFormat("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(context.scheduledAt)
      : formatInterviewDate(context.scheduledAt);
  const time =
    language === "EN"
      ? new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "shortOffset",
        }).format(context.scheduledAt)
      : formatInterviewTime(context.scheduledAt);

  return text.replace(PLACEHOLDER_PATTERN, (_match, key: string) => {
    switch (key.toLowerCase()) {
      case "candidate_name":
        return context.candidateName;
      case "job_title":
        return context.jobTitle;
      case "interview_title":
        return context.interviewTitle;
      case "date":
        return date;
      case "time":
        return time;
      case "duration":
        return String(context.durationMinutes);
      case "recruiter_name":
        return context.recruiterName;
      case "meeting_link":
        // Leave token until Meet link exists (calendar create on server).
        if (context.meetingLink === undefined) return "{{meeting_link}}";
        return meetingLinkLine(context.meetingLink || undefined, language);
      default:
        return _match;
    }
  });
}

export function getBuiltinInterviewTemplate(id: string) {
  return BUILTIN_INTERVIEW_EMAIL_TEMPLATES.find((item) => item.id === id) ?? null;
}

export function buildDefaultInterviewEmailFields(
  context: InterviewInvitationCompileContext,
) {
  const language = context.language ?? "UA";
  if (language === "EN") {
    const template = getBuiltinInterviewTemplate("standard")!;
    return {
      subject: compileInterviewInvitationText(template.subject.EN, context),
      body: compileInterviewInvitationText(template.body.EN, context),
    };
  }

  return {
    subject: buildInterviewInvitationSubject(context),
    body: buildInterviewInvitationBody(context),
  };
}
