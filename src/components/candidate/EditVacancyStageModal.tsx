"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { CandidateProfile } from "@/types";
import { RejectionReasonModal } from "@/components/candidate/RejectionReasonModal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";
import { isRejectedStageName } from "@/lib/pipeline-utils";
import { api } from "@/lib/api/client";

type EditVacancyStageModalProps = {
  profile: CandidateProfile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: CandidateProfile) => void;
};

type JobOption = {
  id: string;
  title: string;
  stages: { id: string; name: string }[];
};

/**
 * Targeted modal: vacancy + pipeline stage only.
 * Does not open profile/metadata/template flows.
 */
export function EditVacancyStageModal({
  profile,
  isOpen,
  onClose,
  onSuccess,
}: EditVacancyStageModalProps) {
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [jobId, setJobId] = useState(profile.job.id);
  const [stageId, setStageId] = useState(profile.stage.id);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRejection, setPendingRejection] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setJobId(profile.job.id);
    setStageId(profile.stage.id);
    setError(null);
    setIsSubmitting(false);
    setPendingRejection(false);
    setIsLoading(true);

    void api.jobs
      .list()
      .then(async (data) => {
        const mapped: JobOption[] = await Promise.all(
          data.map(async (job) => {
            let stages = (job.stages ?? []).map((stage) => ({
              id: stage.id,
              name: stage.name,
            }));
            if (stages.length === 0) {
              try {
                const pipeline = await api.jobs.pipeline(job.id);
                stages = pipeline.stages.map((stage) => ({
                  id: stage.id,
                  name: stage.name,
                }));
              } catch {
                stages = [];
              }
            }
            return { id: job.id, title: job.title, stages };
          }),
        );
        setJobs(mapped);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Не вдалося завантажити вакансії"),
      )
      .finally(() => setIsLoading(false));
  }, [isOpen, profile.job.id, profile.stage.id]);

  const stages = useMemo(
    () => jobs.find((job) => job.id === jobId)?.stages ?? [profile.stage],
    [jobId, jobs, profile.stage],
  );

  useEffect(() => {
    if (!isOpen || stages.length === 0) return;
    if (!stages.some((stage) => stage.id === stageId)) {
      setStageId(stages[0].id);
    }
  }, [isOpen, stageId, stages]);

  if (!isOpen) return null;

  const saveChange = async (rejection?: {
    rejectionReasonId?: string;
    rejectionNote?: string;
    talentPoolTagIds?: string[];
  }) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const jobChanged = jobId !== profile.job.id;

      if (jobChanged) {
        const response = await fetch(`/api/candidates/${profile.id}/applications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId, stageId }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Не вдалося оновити вакансію");
        }

        await api.candidates.update(profile.id, {
          jobId,
          stageId,
          ...rejection,
        });
      } else if (stageId !== profile.stage.id) {
        await api.candidates.updateStage(profile.id, stageId, rejection);
      } else {
        // No-op save — still refresh so UI stays in sync.
      }

      const refreshed = await api.candidates.profile(profile.id);
      onSuccess(refreshed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося зберегти");
    } finally {
      setIsSubmitting(false);
      setPendingRejection(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const stageName = stages.find((stage) => stage.id === stageId)?.name ?? "";
    if (isRejectedStageName(stageName) && stageId !== profile.stage.id) {
      setPendingRejection(true);
      return;
    }
    await saveChange();
  };

  return (
    <>
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
          aria-labelledby="edit-vacancy-title"
          className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-border px-6 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Вакансія та етап
            </p>
            <h2 id="edit-vacancy-title" className="text-lg font-semibold text-foreground">
              {profile.name}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Spinner className="h-4 w-4" />
                Завантаження…
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label htmlFor="edit-vacancy-job" className={formLabelClassName}>
                    Вакансія
                  </label>
                  <select
                    id="edit-vacancy-job"
                    className={formControlClassName}
                    value={jobId}
                    onChange={(event) => setJobId(event.target.value)}
                  >
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="edit-vacancy-stage" className={formLabelClassName}>
                    Етап воронки
                  </label>
                  <select
                    id="edit-vacancy-stage"
                    className={formControlClassName}
                    value={stageId}
                    onChange={(event) => setStageId(event.target.value)}
                    required
                  >
                    {stages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
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
              <Button type="submit" disabled={isSubmitting || isLoading || !stageId}>
                {isSubmitting ? "Збереження…" : "Зберегти"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <RejectionReasonModal
        candidateName={profile.name}
        isOpen={pendingRejection}
        onClose={() => setPendingRejection(false)}
        onConfirm={async (input) => {
          await saveChange(input);
        }}
      />
    </>
  );
}
