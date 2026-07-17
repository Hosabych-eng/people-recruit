"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName } from "@/components/ui/formStyles";
import {
  BUILTIN_INTERVIEW_EMAIL_TEMPLATES,
  compileInterviewInvitationText,
  getBuiltinInterviewTemplate,
  type InterviewEmailLanguage,
} from "@/lib/interview-invitation-templates";
import { api } from "@/lib/api/client";

type ScheduleInterviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onScheduled: () => void | Promise<void>;
  candidateId: string;
  candidateName: string;
  candidateEmail: string | null;
  jobTitle: string;
  recruiterName: string;
  recruiterEmail: string;
};

type FormState = {
  title: string;
  date: string;
  time: string;
  durationMinutes: string;
};

type CustomTemplateOption = {
  id: string;
  title: string;
  subject: string | null;
  body: string;
  durationMinutes: number;
  kind: "custom";
};

function defaultFormState(): FormState {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    title: "1ий Раунд інтерв'ю",
    date: tomorrow.toISOString().slice(0, 10),
    time: "15:00",
    durationMinutes: "45",
  };
}

export function ScheduleInterviewModal({
  isOpen,
  onClose,
  onScheduled,
  candidateId,
  candidateName,
  candidateEmail,
  jobTitle,
  recruiterName,
  recruiterEmail,
}: ScheduleInterviewModalProps) {
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [language, setLanguage] = useState<InterviewEmailLanguage>("UA");
  const [templateKey, setTemplateKey] = useState("builtin:standard");
  const [customTemplates, setCustomTemplates] = useState<CustomTemplateOption[]>([]);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isEmailDirty, setIsEmailDirty] = useState(false);

  const scheduledAt = useMemo(() => {
    if (!form.date || !form.time) return null;
    const value = new Date(`${form.date}T${form.time}`);
    return Number.isNaN(value.getTime()) ? null : value;
  }, [form.date, form.time]);

  const durationMinutes = Number.parseInt(form.durationMinutes, 10) || 45;

  const compileContext = useMemo(
    () => ({
      candidateName: candidateName || "[Candidate Name]",
      jobTitle: jobTitle || "[Job Title]",
      interviewTitle: form.title || "[Interview Title]",
      scheduledAt: scheduledAt ?? new Date(),
      durationMinutes,
      recruiterName: recruiterName || "[Recruiter Name]",
      language,
    }),
    [
      candidateName,
      durationMinutes,
      form.title,
      jobTitle,
      language,
      recruiterName,
      scheduledAt,
    ],
  );

  const resolveTemplateSource = useCallback(() => {
    if (templateKey.startsWith("custom:")) {
      const id = templateKey.slice("custom:".length);
      const custom = customTemplates.find((item) => item.id === id);
      if (!custom) return null;
      return {
        subject:
          custom.subject?.trim() ||
          (language === "EN"
            ? "Interview invitation: {{interview_title}} — {{job_title}}"
            : "Запрошення на інтерв'ю: {{interview_title}} — {{job_title}}"),
        body: custom.body,
        durationMinutes: custom.durationMinutes,
      };
    }

    const builtinId = templateKey.replace(/^builtin:/, "");
    const builtin = getBuiltinInterviewTemplate(builtinId);
    if (!builtin) return null;
    return {
      subject: builtin.subject[language],
      body: builtin.body[language],
      durationMinutes: undefined as number | undefined,
    };
  }, [customTemplates, language, templateKey]);

  const applyTemplate = useCallback(
    (markClean = true) => {
      const source = resolveTemplateSource();
      if (!source) return;
      setEmailSubject(compileInterviewInvitationText(source.subject, compileContext));
      setEmailBody(compileInterviewInvitationText(source.body, compileContext));
      if (source.durationMinutes != null) {
        setForm((current) => ({
          ...current,
          durationMinutes: String(source.durationMinutes),
        }));
      }
      if (markClean) setIsEmailDirty(false);
    },
    [compileContext, resolveTemplateSource],
  );

  useEffect(() => {
    if (!isOpen) return;
    setForm(defaultFormState());
    setIsPreviewOpen(true);
    setError(null);
    setIsSubmitting(false);
    setLanguage("UA");
    setTemplateKey("builtin:standard");
    setIsEmailDirty(false);

    void fetch("/api/interview-templates", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as {
          custom?: CustomTemplateOption[];
        };
        setCustomTemplates(data.custom ?? []);
      })
      .catch(() => setCustomTemplates([]));
  }, [isOpen, candidateId]);

  // Apply / refresh template when form context changes (unless user edited email).
  useEffect(() => {
    if (!isOpen) return;
    if (isEmailDirty) return;
    applyTemplate(false);
  }, [isOpen, applyTemplate, isEmailDirty, templateKey, language]);

  if (!isOpen) return null;

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!scheduledAt) {
      setError("Оберіть коректну дату та час");
      return;
    }
    if (!emailSubject.trim() || !emailBody.trim()) {
      setError("Заповніть тему та текст листа");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Re-compile so remaining placeholders (and later meeting_link on server) resolve.
      const subject = compileInterviewInvitationText(emailSubject.trim(), compileContext);
      const body = compileInterviewInvitationText(emailBody.trim(), compileContext);

      await api.candidates.interviews.create(candidateId, {
        title: form.title.trim(),
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes,
        type: "ONLINE",
        emailSubject: subject,
        emailBody: body,
        emailLanguage: language,
      });
      await onScheduled();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося запланувати інтерв'ю");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Закрити"
        className="absolute inset-0 bg-slate-900/20"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-interview-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Онлайн-інтерв&apos;ю
          </p>
          <h2 id="schedule-interview-title" className="text-lg font-semibold text-foreground">
            Запланувати інтерв&apos;ю
          </h2>
          <p className="mt-1 text-sm text-muted">
            {candidateName} · {candidateEmail}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 overflow-y-auto px-6 py-5">
            <div className="space-y-2">
              <label htmlFor="interview-title" className="text-sm font-medium">
                Назва раунду <span className="text-red-500">*</span>
              </label>
              <input
                id="interview-title"
                type="text"
                required
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                className={formControlClassName}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="interview-date" className="text-sm font-medium">
                  Дата <span className="text-red-500">*</span>
                </label>
                <input
                  id="interview-date"
                  type="date"
                  required
                  value={form.date}
                  onChange={(event) => updateField("date", event.target.value)}
                  className={formControlClassName}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="interview-time" className="text-sm font-medium">
                  Час <span className="text-red-500">*</span>
                </label>
                <input
                  id="interview-time"
                  type="time"
                  required
                  value={form.time}
                  onChange={(event) => updateField("time", event.target.value)}
                  className={formControlClassName}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="interview-duration" className="text-sm font-medium">
                  Тривалість (хв)
                </label>
                <input
                  id="interview-duration"
                  type="number"
                  min={15}
                  max={240}
                  step={15}
                  value={form.durationMinutes}
                  onChange={(event) => updateField("durationMinutes", event.target.value)}
                  className={formControlClassName}
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Формат</span>
                <div className="flex h-[42px] items-center rounded-lg border border-border bg-slate-50 px-3 text-sm text-foreground">
                  Онлайн
                </div>
              </div>
            </div>

            <section className="rounded-xl border border-border bg-background">
              <button
                type="button"
                onClick={() => setIsPreviewOpen((current) => !current)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                aria-expanded={isPreviewOpen}
              >
                <span className="text-sm font-semibold text-foreground">
                  Лист із запрошенням
                </span>
                <span className="text-sm text-muted">{isPreviewOpen ? "Сховати" : "Показати"}</span>
              </button>

              {isPreviewOpen && (
                <div className="space-y-3 border-t border-border px-4 py-4">
                  <p className="text-xs text-muted">
                    Лист буде надіслано на {candidateEmail || "[candidate@email.com]"} від{" "}
                    {recruiterEmail || "[recruiter@company.com]"}.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="interview-template" className="text-sm font-medium">
                        Шаблон
                      </label>
                      <select
                        id="interview-template"
                        value={templateKey}
                        onChange={(event) => {
                          setTemplateKey(event.target.value);
                          setIsEmailDirty(false);
                        }}
                        className={formControlClassName}
                      >
                        <optgroup label="Вбудовані">
                          {BUILTIN_INTERVIEW_EMAIL_TEMPLATES.map((item) => (
                            <option key={item.id} value={`builtin:${item.id}`}>
                              {item.title}
                            </option>
                          ))}
                        </optgroup>
                        {customTemplates.length > 0 && (
                          <optgroup label="З налаштувань">
                            {customTemplates.map((item) => (
                              <option key={item.id} value={`custom:${item.id}`}>
                                {item.title}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="interview-language" className="text-sm font-medium">
                        Мова
                      </label>
                      <select
                        id="interview-language"
                        value={language}
                        onChange={(event) => {
                          setLanguage(event.target.value as InterviewEmailLanguage);
                          setIsEmailDirty(false);
                        }}
                        className={formControlClassName}
                      >
                        <option value="UA">UA</option>
                        <option value="EN">EN</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="interview-email-subject" className="text-sm font-medium">
                      Тема
                    </label>
                    <input
                      id="interview-email-subject"
                      type="text"
                      required
                      value={emailSubject}
                      onChange={(event) => {
                        setEmailSubject(event.target.value);
                        setIsEmailDirty(true);
                      }}
                      className={formControlClassName}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="interview-email-body" className="text-sm font-medium">
                      Текст листа
                    </label>
                    <textarea
                      id="interview-email-body"
                      required
                      rows={10}
                      value={emailBody}
                      onChange={(event) => {
                        setEmailBody(event.target.value);
                        setIsEmailDirty(true);
                      }}
                      className={formControlClassName}
                    />
                    <p className="text-xs text-muted">
                      Плейсхолдери:{" "}
                      {"{{candidate_name}}, {{job_title}}, {{interview_title}}, {{date}}, {{time}}, {{duration}}, {{recruiter_name}}, {{meeting_link}}"}
                    </p>
                    {isEmailDirty && (
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() => applyTemplate(true)}
                      >
                        Відновити з шаблону
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Скасувати
            </Button>
            <Button type="submit" disabled={isSubmitting || !scheduledAt}>
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Збереження…
                </span>
              ) : (
                "Запланувати та надіслати"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
