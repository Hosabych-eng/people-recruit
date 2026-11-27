"use client";

import { useCallback, useEffect, useState } from "react";
import type { CandidateEvaluation, CandidateProfile } from "@/types";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName } from "@/components/ui/formStyles";
import { api } from "@/lib/api/client";

type CandidateEvaluationPanelProps = {
  profile: CandidateProfile;
  onProfileChange: (profile: CandidateProfile) => void;
};

const SCORE_OPTIONS = [1, 2, 3, 4, 5] as const;

export function CandidateEvaluationPanel({
  profile,
  onProfileChange,
}: CandidateEvaluationPanelProps) {
  const [evaluation, setEvaluation] = useState<CandidateEvaluation | null>(null);
  const [draftScores, setDraftScores] = useState<Record<string, number>>({});
  const [newCriteria, setNewCriteria] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvaluation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.candidates.evaluation.get(profile.id);
      setEvaluation(data);
      setDraftScores(
        Object.fromEntries(data.scores.map((row) => [row.criterionId, row.score])),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося завантажити оцінку");
    } finally {
      setIsLoading(false);
    }
  }, [profile.id]);

  useEffect(() => {
    void loadEvaluation();
  }, [loadEvaluation]);

  const handleSaveScores = async () => {
    if (!evaluation || evaluation.criteria.length === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      const result = await api.candidates.evaluation.save(
        profile.id,
        evaluation.criteria.map((criterion) => ({
          criterionId: criterion.id,
          score: draftScores[criterion.id] ?? 3,
        })),
      );
      onProfileChange({ ...profile, evaluationAverage: result.average });
      await loadEvaluation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося зберегти оцінку");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCriteria = async () => {
    const names = newCriteria
      .split(/[\n,;]+/)
      .map((name) => name.trim())
      .filter(Boolean);
    if (names.length === 0) return;

    setIsSaving(true);
    setError(null);
    try {
      await api.jobs.evaluation.save(profile.job.id, names);
      setNewCriteria("");
      await loadEvaluation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося зберегти критерії");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Оцінка (scorecard)</h3>
        {evaluation?.average != null && (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
            ★ {evaluation.average.toFixed(1)}/5
          </span>
        )}
      </div>
      <p className="mb-3 text-xs text-muted">
        Критерії вакансії «{profile.job.title}». Шкала 1–5.
      </p>

      {error && (
        <p className="mb-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted">
          <Spinner className="h-4 w-4" />
          Завантаження…
        </div>
      ) : !evaluation || evaluation.criteria.length === 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted">
            Критеріїв ще немає. Додайте до 5 назв (через кому або з нового рядка).
          </p>
          <textarea
            rows={3}
            value={newCriteria}
            onChange={(event) => setNewCriteria(event.target.value)}
            className={`${formControlClassName} text-xs`}
            placeholder="Комунікація, Технічні навички, Культурний фіт"
          />
          <Button
            type="button"
            size="sm"
            disabled={isSaving || !newCriteria.trim()}
            onClick={() => void handleCreateCriteria()}
          >
            {isSaving ? "Збереження…" : "Створити критерії"}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <ul className="space-y-2">
            {evaluation.criteria.map((criterion) => (
              <li
                key={criterion.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                  {criterion.name}
                </span>
                <select
                  className="h-7 w-16 rounded border border-border px-1.5 text-[11px]"
                  value={draftScores[criterion.id] ?? 3}
                  onChange={(event) =>
                    setDraftScores((current) => ({
                      ...current,
                      [criterion.id]: Number(event.target.value),
                    }))
                  }
                >
                  {SCORE_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            size="sm"
            disabled={isSaving}
            onClick={() => void handleSaveScores()}
          >
            {isSaving ? "Збереження…" : "Зберегти оцінку"}
          </Button>
        </div>
      )}
    </section>
  );
}
