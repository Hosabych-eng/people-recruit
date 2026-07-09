export type TestAssignmentEmailInput = {
  candidateName: string;
  jobTitle: string;
  templateTitle: string;
  recruiterName: string;
  uploadUrl?: string;
};

export function buildTestAssignmentSubject(input: TestAssignmentEmailInput) {
  return `Тестове завдання: ${input.templateTitle} — ${input.jobTitle}`;
}

export function buildTestAssignmentBody(input: TestAssignmentEmailInput) {
  return [
    `Вітаємо, ${input.candidateName}!`,
    "",
    `Надсилаємо вам тестове завдання «${input.templateTitle}» для позиції ${input.jobTitle}.`,
    "Файл із описом завдання додано до цього листа.",
    "",
    input.uploadUrl
      ? `Завантажте виконане завдання за безпечним посиланням:\n${input.uploadUrl}`
      : "Будь ласка, виконайте завдання та надішліть результат у відповідь на цей лист.",
    "",
    "З повагою,",
    input.recruiterName,
  ].join("\n");
}

export function buildTestAssignmentHtml(input: TestAssignmentEmailInput) {
  const escape = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <p>Вітаємо, <strong>${escape(input.candidateName)}</strong>!</p>
      <p>
        Надсилаємо вам тестове завдання
        <strong>«${escape(input.templateTitle)}»</strong>
        для позиції <strong>${escape(input.jobTitle)}</strong>.
      </p>
      <p>Файл із описом завдання додано до цього листа.</p>
      ${
        input.uploadUrl
          ? `<p>Завантажте виконане завдання за <a href="${escape(input.uploadUrl)}">безпечним посиланням</a>.</p>`
          : "<p>Будь ласка, виконайте завдання та надішліть результат у відповідь на цей лист.</p>"
      }
      <p>З повагою,<br />${escape(input.recruiterName)}</p>
    </div>
  `.trim();
}
