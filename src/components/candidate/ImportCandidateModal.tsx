"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CandidateImportResult } from "@/types";
import { DuplicateCandidatePanel } from "@/components/candidate/DuplicateCandidatePanel";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";
import { api } from "@/lib/api/client";
import { parseCandidateImportInput } from "@/lib/candidates/import-parser";

type ImportCandidateModalProps = {
  pipeline: {
    id: string;
    title: string;
    stages: { id: string; name: string }[];
  };
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
};

type ImportMode = "paste" | "url";

type FormState = {
  rawInput: string;
  name: string;
  email: string;
  phone: string;
  resumeLink: string;
  stageId: string;
};

export function ImportCandidateModal({
  pipeline,
  isOpen,
  onClose,
  onImported,
}: ImportCandidateModalProps) {
  const router = useRouter();
  const defaultStageId = pipeline.stages[0]?.id ?? "";
  const [mode, setMode] = useState<ImportMode>("paste");
  const [form, setForm] = useState<FormState>({
    rawInput: "",
    name: "",
    email: "",
    phone: "",
    resumeLink: "",
    stageId: defaultStageId,
  });
  const [duplicateResult, setDuplicateResult] = useState<CandidateImportResult | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setMode("paste");
    setForm({
      rawInput: "",
      name: "",
      email: "",
      phone: "",
      resumeLink: "",
      stageId: pipeline.stages[0]?.id ?? "",
    });
    setDuplicateResult(null);
    setError(null);
    setIsSubmitting(false);
  }, [isOpen, pipeline.id, pipeline.stages]);

  const parsedPreview = useMemo(
    () => (form.rawInput.trim() ? parseCandidateImportInput(form.rawInput) : null),
    [form.rawInput],
  );

  if (!isOpen) return null;

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const applyParsedFields = () => {
    if (!parsedPreview) return;
    setForm((current) => ({
      ...current,
      name: current.name || parsedPreview.name || "",
      email: current.email || parsedPreview.email || "",
      phone: current.phone || parsedPreview.phone || "",
      resumeLink: current.resumeLink || parsedPreview.resumeLink || "",
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    setDuplicateResult(null);

    try {
      const result = await api.candidates.import({
        jobId: pipeline.id,
        stageId: form.stageId,
        rawInput: form.rawInput.trim() || undefined,
        name: form.name.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        resumeLink: form.resumeLink.trim() || undefined,
        applicationSource: parsedPreview?.applicationSource,
      });

      if (result.isDuplicate && result.history) {
        setDuplicateResult(result);
        return;
      }

      onImported();
      onClose();
      router.push(`/candidates/${result.candidate.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося імпортувати кандидата");
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
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Імпорт кандидата
          </p>
          <h2 className="text-lg font-semibold text-foreground">
            {pipeline.title}
          </h2>
        </div>

        {duplicateResult?.isDuplicate && duplicateResult.history ? (
          <div className="px-6 py-6">
            <DuplicateCandidatePanel
              candidate={duplicateResult.candidate}
              history={duplicateResult.history}
              onClose={onClose}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("paste")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  mode === "paste"
                    ? "bg-primary text-primary-foreground"
                    : "bg-slate-100 text-muted"
                }`}
              >
                Вставити текст
              </button>
              <button
                type="button"
                onClick={() => setMode("url")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  mode === "url"
                    ? "bg-primary text-primary-foreground"
                    : "bg-slate-100 text-muted"
                }`}
              >
                URL профілю
              </button>
            </div>

            <div className="space-y-2">
              <label htmlFor="import-raw" className={formLabelClassName}>
                {mode === "paste" ? "Текст з LinkedIn / Djinni" : "Посилання на профіль"}
              </label>
              {mode === "paste" ? (
                <textarea
                  id="import-raw"
                  rows={6}
                  value={form.rawInput}
                  onChange={(event) => updateField("rawInput", event.target.value)}
                  className={formControlClassName}
                  placeholder="Вставте текст профілю, email, телефон або посилання…"
                />
              ) : (
                <input
                  id="import-raw"
                  type="url"
                  value={form.rawInput}
                  onChange={(event) => updateField("rawInput", event.target.value)}
                  className={formControlClassName}
                  placeholder="https://linkedin.com/in/... або https://djinni.co/q/..."
                />
              )}
              {parsedPreview && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-2 text-xs text-muted">
                  <span>
                    Розпізнано:{" "}
                    {[parsedPreview.name, parsedPreview.email, parsedPreview.resumeLink]
                      .filter(Boolean)
                      .join(" · ") || "нічого"}
                  </span>
                  <button
                    type="button"
                    onClick={applyParsedFields}
                    className="font-medium text-primary hover:underline"
                  >
                    Застосувати
                  </button>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="import-name" className={formLabelClassName}>
                  Ім&apos;я
                </label>
                <input
                  id="import-name"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  className={formControlClassName}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="import-email" className={formLabelClassName}>
                  Email
                </label>
                <input
                  id="import-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  className={formControlClassName}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="import-phone" className={formLabelClassName}>
                  Телефон
                </label>
                <input
                  id="import-phone"
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  className={formControlClassName}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="import-resume" className={formLabelClassName}>
                  URL профілю / резюме
                </label>
                <input
                  id="import-resume"
                  value={form.resumeLink}
                  onChange={(event) => updateField("resumeLink", event.target.value)}
                  className={formControlClassName}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="import-stage" className={formLabelClassName}>
                Етап воронки <span className="text-red-500">*</span>
              </label>
              <select
                id="import-stage"
                required
                value={form.stageId}
                onChange={(event) => updateField("stageId", event.target.value)}
                className={formControlClassName}
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

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Скасувати
              </Button>
              <Button type="submit" disabled={isSubmitting || !form.stageId}>
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    Перевірка…
                  </span>
                ) : (
                  "Імпортувати"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
