"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";

export type RejectionReasonOption = {
  id: string;
  name: string;
};

type RejectionReasonModalProps = {
  candidateName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (input: {
    rejectionReasonId: string;
    rejectionNote: string;
    talentPoolTagIds?: string[];
  }) => Promise<void>;
};

type TalentPoolTag = { id: string; name: string; color: string };

export function RejectionReasonModal({
  candidateName,
  isOpen,
  onClose,
  onConfirm,
}: RejectionReasonModalProps) {
  const [reasons, setReasons] = useState<RejectionReasonOption[]>([]);
  const [talentTags, setTalentTags] = useState<TalentPoolTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [reasonId, setReasonId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setReasonId("");
    setSelectedTagIds([]);
    setNote("");
    setError(null);
    setIsLoading(true);

    void Promise.all([
      fetch("/api/rejection-reasons").then((r) => r.json()),
      fetch("/api/candidate-tags").then((r) => r.json()),
    ])
      .then(([reasonItems, tagItems]) => {
        setReasons(reasonItems);
        setTalentTags(tagItems);
      })
      .catch(() => setError("Не вдалося завантажити причини відмов"))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reasonId) {
      setError("Оберіть причину відмови");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm({
        rejectionReasonId: reasonId,
        rejectionNote: note.trim(),
        talentPoolTagIds: selectedTagIds,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося зберегти");
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
        className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-foreground">Причина відмови</h2>
        <p className="mt-1 text-sm text-muted">
          Кандидат: <span className="font-medium text-foreground">{candidateName}</span>
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <label htmlFor="rejection-reason" className={formLabelClassName}>
              Причина <span className="text-red-500">*</span>
            </label>
            {isLoading ? (
              <p className="text-sm text-muted">Завантаження…</p>
            ) : (
              <select
                id="rejection-reason"
                required
                value={reasonId}
                onChange={(e) => setReasonId(e.target.value)}
                className={formControlClassName}
              >
                <option value="">Оберіть причину…</option>
                {reasons.map((reason) => (
                  <option key={reason.id} value={reason.id}>
                    {reason.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {talentTags.length > 0 && (
            <div className="space-y-2">
              <p className={formLabelClassName}>Talent pool tags</p>
              <div className="flex flex-wrap gap-2">
                {talentTags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() =>
                        setSelectedTagIds((current) =>
                          selected
                            ? current.filter((id) => id !== tag.id)
                            : [...current, tag.id],
                        )
                      }
                      className={`rounded-full px-2.5 py-1 text-xs font-medium text-white transition-opacity ${
                        selected ? "ring-2 ring-primary ring-offset-1" : "opacity-70 hover:opacity-100"
                      }`}
                      style={{ background: tag.color }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="rejection-note" className={formLabelClassName}>
              Коментар (необов&apos;язково)
            </label>
            <textarea
              id="rejection-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={formControlClassName}
              placeholder="Додаткові деталі…"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Скасувати
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading || !reasonId}>
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Збереження…
                </span>
              ) : (
                "Підтвердити"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
