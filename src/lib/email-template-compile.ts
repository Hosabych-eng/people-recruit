export type EmailTemplateContext = {
  candidateName: string;
  jobTitle: string;
  recruiterName?: string;
};

const PLACEHOLDER_PATTERN =
  /\{\{\s*(candidate_name|job_title|recruiter_name)\s*\}\}/gi;

export function compileEmailTemplate(text: string, context: EmailTemplateContext) {
  return text.replace(PLACEHOLDER_PATTERN, (match, key: string) => {
    switch (key.toLowerCase()) {
      case "candidate_name":
        return context.candidateName;
      case "job_title":
        return context.jobTitle;
      case "recruiter_name":
        return context.recruiterName ?? "";
      default:
        return match;
    }
  });
}

export function plainTextToHtml(text: string) {
  const escape = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  return `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; white-space: pre-wrap;">${escape(text)}</div>`;
}

export const EMAIL_TEMPLATE_PLACEHOLDERS = [
  "{{candidate_name}}",
  "{{job_title}}",
  "{{recruiter_name}}",
] as const;
