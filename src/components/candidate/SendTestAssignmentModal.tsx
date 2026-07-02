"use client";

import { useEffect, useState } from "react";
import type { CandidateTestAssignment, TestAssignmentTemplate } from "@/types";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";
import { api } from "@/lib/api/client";

type SendTestAssignmentModalProps = {
  candidateId: string;
  candidateName: string;
  isOpen: boolean;
  onClose: () => void;
  onSent: (assignment: CandidateTestAssignment) => void;
};

export function SendTestAssignmentModal({
  candidateId,
  candidateName,
  isOpen,
  onClose,
  onSent,
}: SendTestAssignmentModalProps) {
  const [templates, setTemplates] = useState<TestAssignmentTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setTemplateId("");
    setError(null);
    setIsLoading(true);

    void api.testAssignmentTemplates
      .list()
      .then((data) => {
        setTemplates(data);
        setTemplateId(data[0]?.id ?? "");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Не вдалося завантажити шаблони");
      })
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!templateId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const assignment = await api.candidates.testAssignments.send(candidateId, templateId);
      onSent(assignment);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося надіслати тестове завдання");
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
        className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Надіслати тестове завдання</h2>
          <p className="mt-1 text-sm text-muted">Кандидат: {candidateName}</p>
        </div>

        <div className="space-y-4 px-6 py-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted">
              Немає доступних шаблонів. Спочатку завантажте шаблон у розділі «Тестові завдання».
            </p>
          ) : (
            <div className="space-y-2">
              <label htmlFor="test-template" className={formLabelClassName}>
                Шаблон <span className="text-red-500">*</span>
              </label>
              <select
                id="test-template"
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                className={formControlClassName}
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title} ({template.fileName})
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Скасувати
            </Button>
            <Button
              type="button"
              onClick={() => void handleSend()}
              disabled={isSubmitting || !templateId || templates.length === 0}
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Надсилання…
                </span>
              ) : (
                "Надіслати"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
