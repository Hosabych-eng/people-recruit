"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { CandidateImportResult } from "@/types";
import { DuplicateCandidatePanel } from "@/components/candidate/DuplicateCandidatePanel";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api/client";

type AddCandidateModalProps = {
  pipeline: {
    id: string;
    title: string;
    stages: { id: string; name: string }[];
  };
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  resumeLink: string;
  stageId: string;
};

const inputClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

export function AddCandidateModal({
  pipeline,
  isOpen,
  onClose,
  onCreated,
}: AddCandidateModalProps) {
  const defaultStageId = pipeline.stages[0]?.id ?? "";

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    resumeLink: "",
    stageId: defaultStageId,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateResult, setDuplicateResult] = useState<CandidateImportResult | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setForm({
      name: "",
      email: "",
      phone: "",
      resumeLink: "",
      stageId: pipeline.stages[0]?.id ?? "",
    });
    setError(null);
    setIsSubmitting(false);
    setDuplicateResult(null);
  }, [isOpen, pipeline.id, pipeline.stages]);

  if (!isOpen) return null;

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await api.candidates.create({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        resumeLink: form.resumeLink.trim() || undefined,
        jobId: pipeline.id,
        stageId: form.stageId,
      });

      if (result.isDuplicate && result.history) {
        setDuplicateResult(result);
        return;
      }

      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add candidate");
    } finally {
      setIsSubmitting(false);
    }
  };

  const linkDuplicate = async (updateProfile: boolean) => {
    if (!duplicateResult?.candidate) return;
    const response = await fetch(
      `/api/candidates/${duplicateResult.candidate.id}/link-application`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: pipeline.id,
          stageId: form.stageId,
          updateProfile: updateProfile
            ? {
                name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim() || undefined,
                resumeLink: form.resumeLink.trim() || undefined,
              }
            : undefined,
        }),
      },
    );
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to link candidate");
    }
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Close add candidate form"
        className="absolute inset-0 bg-slate-900/20"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-candidate-title"
        className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
          <div className="border-b border-border px-6 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              New candidate
            </p>
            <h2
              id="add-candidate-title"
              className="text-lg font-semibold text-foreground"
            >
              Add to {pipeline.title}
            </h2>
          </div>

          {duplicateResult?.isDuplicate && duplicateResult.history ? (
            <div className="space-y-4 px-6 py-6">
              <p className="text-sm font-medium text-foreground">
                Candidate already exists. Update profile or link to this vacancy?
              </p>
              <DuplicateCandidatePanel
                candidate={duplicateResult.candidate}
                history={duplicateResult.history}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDuplicateResult(null)}>
                  Back
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void linkDuplicate(false).catch((err) => setError(err.message))
                  }
                >
                  Link to vacancy
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    void linkDuplicate(true).catch((err) => setError(err.message))
                  }
                >
                  Update profile & link
                </Button>
              </div>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
            <div className="space-y-2">
              <label htmlFor="candidate-name" className="text-sm font-medium">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                id="candidate-name"
                type="text"
                required
                autoFocus
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                className={inputClassName}
                placeholder="Іван Петренко"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="candidate-email" className="text-sm font-medium">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="candidate-email"
                type="email"
                required
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                className={inputClassName}
                placeholder="ivan@example.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="candidate-phone" className="text-sm font-medium">
                Phone
              </label>
              <input
                id="candidate-phone"
                type="tel"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                className={inputClassName}
                placeholder="+380 67 123 4567"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="candidate-resume" className="text-sm font-medium">
                Resume link
              </label>
              <input
                id="candidate-resume"
                type="url"
                value={form.resumeLink}
                onChange={(event) => updateField("resumeLink", event.target.value)}
                className={inputClassName}
                placeholder="https://linkedin.com/in/ivan-petrenko"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="candidate-stage" className="text-sm font-medium">
                Initial stage <span className="text-red-500">*</span>
              </label>
              <select
                id="candidate-stage"
                required
                value={form.stageId}
                onChange={(event) => updateField("stageId", event.target.value)}
                className={inputClassName}
              >
                {pipeline.stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !form.stageId}>
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Adding…
                  </>
                ) : (
                  "Додати кандидата"
                )}
              </Button>
            </div>
          </form>
          )}
        </div>
    </div>
  );
}
