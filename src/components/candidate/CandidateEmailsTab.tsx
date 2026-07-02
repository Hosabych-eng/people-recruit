"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { CandidateEmailMessage, EmailTemplate } from "@/types";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";
import { compileEmailTemplate } from "@/lib/email-template-compile";
import { formatRelativeTimeUk } from "@/lib/format-relative-time";
import { api } from "@/lib/api/client";

const STATUS_LABELS: Record<CandidateEmailMessage["status"], string> = {
  QUEUED: "В черзі",
  SENT: "Надіслано",
  DELIVERED: "Доставлено",
  FAILED: "Помилка",
  RECEIVED: "Отримано",
};

const STATUS_STYLES: Record<CandidateEmailMessage["status"], string> = {
  QUEUED: "bg-slate-100 text-slate-600",
  SENT: "bg-sky-50 text-sky-700",
  DELIVERED: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-red-50 text-red-700",
  RECEIVED: "bg-violet-50 text-violet-700",
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

type CandidateEmailsTabProps = {
  candidateId: string;
  candidateName: string;
  candidateEmail: string | null;
  jobTitle: string;
  recruiterName: string;
  emails: CandidateEmailMessage[];
  onEmailSent: (email: CandidateEmailMessage) => void;
};

export function CandidateEmailsTab({
  candidateId,
  candidateName,
  candidateEmail,
  jobTitle,
  recruiterName,
  emails,
  onEmailSent,
}: CandidateEmailsTabProps) {
  const [isComposing, setIsComposing] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const templateContext = {
    candidateName,
    jobTitle,
    recruiterName,
  };

  useEffect(() => {
    if (!isComposing) return;

    setIsLoadingTemplates(true);
    void api.emailTemplates
      .list()
      .then((data) => {
        setTemplates(data);
        const first = data[0];
        if (first) {
          setSelectedTemplateId(first.id);
          setSubject(compileEmailTemplate(first.subject, templateContext));
          setBody(compileEmailTemplate(first.body, templateContext));
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Не вдалося завантажити шаблони");
      })
      .finally(() => setIsLoadingTemplates(false));
  }, [isComposing, candidateName, jobTitle, recruiterName]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;

    setSubject(compileEmailTemplate(template.subject, templateContext));
    setBody(compileEmailTemplate(template.body, templateContext));
  };

  const handleStartCompose = () => {
    setIsComposing(true);
    setSubject("");
    setBody("");
    setError(null);
  };

  const handleCancelCompose = () => {
    setIsComposing(false);
    setSelectedTemplateId("");
    setSubject("");
    setBody("");
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const sent = await api.candidates.emails.send(candidateId, {
        subject: subject.trim(),
        body: body.trim(),
      });
      onEmailSent(sent);
      handleCancelCompose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося надіслати лист");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-foreground">Електронні листи</h2>
          <p className="mt-1 text-sm text-muted">
            {candidateEmail
              ? `Листування з ${candidateEmail} через Gmail`
              : "Email не вказано — додайте в профілі перед надсиланням листів"}
          </p>
        </div>
        {!isComposing && (
          <Button size="sm" onClick={handleStartCompose}>
            Написати лист
          </Button>
        )}
      </div>

      {isComposing && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">Новий лист</h3>
            <Button type="button" variant="outline" size="sm" onClick={handleCancelCompose}>
              Скасувати
            </Button>
          </div>

          <div className="space-y-2">
            <label htmlFor="email-template" className={formLabelClassName}>
              Шаблон
            </label>
            {isLoadingTemplates ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Spinner className="h-4 w-4" />
                Завантаження шаблонів…
              </div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted">
                Шаблонів ще немає. Створіть їх у розділі «Воронки».
              </p>
            ) : (
              <select
                id="email-template"
                value={selectedTemplateId}
                onChange={(event) => handleTemplateChange(event.target.value)}
                className={formControlClassName}
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="email-subject" className={formLabelClassName}>
              Тема
            </label>
            <input
              id="email-subject"
              required
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className={formControlClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email-body" className={formLabelClassName}>
              Текст листа
            </label>
            <textarea
              id="email-body"
              required
              rows={10}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className={formControlClassName}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !subject.trim() || !body.trim()}>
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Надсилання…
                </span>
              ) : (
                "Надіслати через Gmail"
              )}
            </Button>
          </div>
        </form>
      )}

      {emails.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">Ще немає листування</p>
          <p className="mt-2 text-sm text-muted">
            Натисніть «Написати лист», щоб надіслати перше повідомлення.
          </p>
        </div>
      ) : (
        <ol className="relative space-y-4 border-l border-border pl-6">
          {emails.map((message) => {
            const isOutbound = message.direction === "OUTBOUND";

            return (
              <li key={message.id} className="relative">
                <span
                  className={`absolute -left-[1.84rem] top-5 h-3 w-3 rounded-full ring-4 ring-background ${
                    isOutbound ? "bg-sky-500" : "bg-violet-500"
                  }`}
                  aria-hidden
                />

                <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            isOutbound
                              ? "bg-sky-50 text-sky-700"
                              : "bg-violet-50 text-violet-700"
                          }`}
                        >
                          {isOutbound ? "Вихідний" : "Вхідний"}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[message.status]}`}
                        >
                          {STATUS_LABELS[message.status]}
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-semibold text-foreground">
                        {message.subject}
                      </h3>
                    </div>
                    <div className="text-right text-xs text-muted">
                      <time dateTime={message.sentAt}>{formatTimestamp(message.sentAt)}</time>
                      <p className="mt-1">{formatRelativeTimeUk(message.sentAt)}</p>
                    </div>
                  </div>

                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                        Відправник
                      </dt>
                      <dd className="mt-1 text-foreground">
                        {message.senderName}
                        <span className="block text-muted">{message.senderEmail}</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                        Одержувач
                      </dt>
                      <dd className="mt-1 text-foreground">
                        {message.recipientName}
                        <span className="block text-muted">{message.recipientEmail}</span>
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 rounded-lg border border-border bg-background px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {message.body}
                    </p>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
