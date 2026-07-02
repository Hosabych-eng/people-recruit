"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";
import { api } from "@/lib/api/client";

type CreatePipelineModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (jobId: string) => void;
};

export function CreatePipelineModal({
  isOpen,
  onClose,
  onCreated,
}: CreatePipelineModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle("");
    setDescription("");
    setError(null);
    setIsSubmitting(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const job = await api.jobs.create({
        title: title.trim(),
        description:
          description.trim() ||
          "Налаштуйте етапи воронки для цієї посади.",
        status: "DRAFT",
      });
      onCreated(job.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося створити воронку");
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
        aria-labelledby="create-pipeline-title"
        className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
          <div className="border-b border-border px-6 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Воронки
            </p>
            <h2 id="create-pipeline-title" className="text-lg font-semibold text-foreground">
              Нова воронка
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
            <label className="block space-y-2">
              <span className={formLabelClassName}>Назва воронки</span>
              <input
                required
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={formControlClassName}
                placeholder="AI Product Lead"
              />
            </label>

            <label className="block space-y-2">
              <span className={formLabelClassName}>Опис (необовʼязково)</span>
              <textarea
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={`${formControlClassName} resize-y`}
                placeholder="Короткий опис процесу найму"
              />
            </label>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Скасувати
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Створення…
                  </>
                ) : (
                  "Створити"
                )}
              </Button>
            </div>
          </form>
        </div>
    </div>
  );
}
