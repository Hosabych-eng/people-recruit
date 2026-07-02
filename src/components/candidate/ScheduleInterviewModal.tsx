"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName } from "@/components/ui/formStyles";
import {
  buildInterviewInvitationBody,
  buildInterviewInvitationSubject,
} from "@/lib/interview-email-template";
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

  useEffect(() => {
    if (!isOpen) return;
    setForm(defaultFormState());
    setIsPreviewOpen(true);
    setError(null);
    setIsSubmitting(false);
  }, [isOpen, candidateId]);

  const scheduledAt = useMemo(() => {
    if (!form.date || !form.time) return null;
    const value = new Date(`${form.date}T${form.time}`);
    return Number.isNaN(value.getTime()) ? null : value;
  }, [form.date, form.time]);

  const durationMinutes = Number.parseInt(form.durationMinutes, 10) || 45;

  const emailPreview = useMemo(() => {
    if (!scheduledAt) {
      return {
        subject: buildInterviewInvitationSubject({
          candidateName: candidateName || "[Candidate Name]",
          jobTitle: jobTitle || "[Job Title]",
          interviewTitle: form.title || "[Interview Title]",
          scheduledAt: new Date(),
          durationMinutes,
          recruiterName: recruiterName || "[Recruiter Name]",
        }),
        body: "Оберіть дату та час, щоб побачити попередній перегляд листа.",
      };
    }

    return {
      subject: buildInterviewInvitationSubject({
        candidateName,
        jobTitle,
        interviewTitle: form.title,
        scheduledAt,
        durationMinutes,
        recruiterName,
      }),
      body: buildInterviewInvitationBody({
        candidateName,
        jobTitle,
        interviewTitle: form.title,
        scheduledAt,
        durationMinutes,
        recruiterName,
      }),
    };
  }, [
    candidateName,
    durationMinutes,
    form.title,
    jobTitle,
    recruiterName,
    scheduledAt,
  ]);

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

    setIsSubmitting(true);
    setError(null);

    try {
      await api.candidates.interviews.create(candidateId, {
        title: form.title.trim(),
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes,
        type: "ONLINE",
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
                    Автоматичний лист буде надіслано на {candidateEmail || "[candidate@email.com]"} від{" "}
                    {recruiterEmail || "[recruiter@company.com]"}.
                  </p>
                  <div className="rounded-lg border border-dashed border-border bg-card p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">
                      Тема
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {emailPreview.subject}
                    </p>
                  </div>
                  <div className="rounded-lg border border-dashed border-border bg-card p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">
                      Текст листа
                    </p>
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
                      {emailPreview.body}
                    </pre>
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
