"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { CandidateProfile } from "@/types";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";
import { api } from "@/lib/api/client";

type EditCandidateModalProps = {
  profile: CandidateProfile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: CandidateProfile) => void;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  resumeLink: string;
  stageId: string;
  isNew: boolean;
};

function buildFormState(profile: CandidateProfile): FormState {
  return {
    name: profile.name,
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    resumeLink: profile.resumeLink ?? "",
    stageId: profile.stage.id,
    isNew: profile.isNew,
  };
}

export function EditCandidateModal({
  profile,
  isOpen,
  onClose,
  onSuccess,
}: EditCandidateModalProps) {
  const [form, setForm] = useState<FormState>(() => buildFormState(profile));
  const [stages, setStages] = useState<{ id: string; name: string }[]>([
    profile.stage,
  ]);
  const [isLoadingStages, setIsLoadingStages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setForm(buildFormState(profile));
    setError(null);
    setIsSubmitting(false);
    setIsLoadingStages(true);

    void api.jobs
      .pipeline(profile.job.id)
      .then((pipeline) => {
        setStages(
          pipeline.stages.map((stage) => ({ id: stage.id, name: stage.name })),
        );
      })
      .catch(() => {
        setStages([profile.stage]);
      })
      .finally(() => {
        setIsLoadingStages(false);
      });
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      resumeLink: form.resumeLink.trim() || null,
      stageId: form.stageId,
      isNew: form.isNew,
    };

    try {
      await api.candidates.update(profile.id, payload);
      const refreshed = await api.candidates.profile(profile.id);
      onSuccess(refreshed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося зберегти зміни");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Закрити форму редагування"
        className="absolute inset-0 bg-slate-900/20"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-candidate-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Редагування профілю
          </p>
          <h2 id="edit-candidate-title" className="text-lg font-semibold text-foreground">
            {profile.name}
          </h2>
          <p className="mt-1 text-sm text-muted">{profile.job.title}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          <div className="space-y-2">
            <label htmlFor="edit-candidate-name" className={formLabelClassName}>
              Ім&apos;я <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-candidate-name"
              type="text"
              required
              autoFocus
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className={formControlClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-candidate-email" className={formLabelClassName}>
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-candidate-email"
              type="email"
              required
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              className={formControlClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-candidate-phone" className={formLabelClassName}>
              Телефон
            </label>
            <input
              id="edit-candidate-phone"
              type="tel"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              className={formControlClassName}
              placeholder="+380 67 123 4567"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-candidate-resume" className={formLabelClassName}>
              Посилання на резюме
            </label>
            <input
              id="edit-candidate-resume"
              type="url"
              value={form.resumeLink}
              onChange={(event) => updateField("resumeLink", event.target.value)}
              className={formControlClassName}
              placeholder="https://linkedin.com/in/candidate"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-candidate-stage" className={formLabelClassName}>
              Статус у воронці <span className="text-red-500">*</span>
            </label>
            <select
              id="edit-candidate-stage"
              required
              disabled={isLoadingStages}
              value={form.stageId}
              onChange={(event) => updateField("stageId", event.target.value)}
              className={formControlClassName}
            >
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.isNew}
              onChange={(event) => updateField("isNew", event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            />
            Позначити як нового кандидата
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Скасувати
            </Button>
            <Button type="submit" disabled={isSubmitting || !form.stageId}>
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Збереження…
                </span>
              ) : (
                "Зберегти"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
