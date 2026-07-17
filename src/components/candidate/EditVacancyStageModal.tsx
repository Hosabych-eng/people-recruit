"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { JobStatus } from "@prisma/client";
import type { CandidateProfile } from "@/types";
import { RejectionReasonModal } from "@/components/candidate/RejectionReasonModal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";
import { JOB_STATUS_OPTIONS } from "@/lib/job-status";
import { isRejectedStageName } from "@/lib/pipeline-utils";
import { api } from "@/lib/api/client";

type EditVacancyStageModalProps = {
  profile: CandidateProfile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: CandidateProfile) => void;
};

/**
 * Current vacancy context only: job status + pipeline stage.
 * Does not switch jobs / navigate away.
 */
export function EditVacancyStageModal({
  profile,
  isOpen,
  onClose,
  onSuccess,
}: EditVacancyStageModalProps) {
  const [stages, setStages] = useState<{ id: string; name: string }[]>([
    profile.stage,
  ]);
  const [jobStatus, setJobStatus] = useState<JobStatus>(profile.job.status);
  const [stageId, setStageId] = useState(profile.stage.id);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRejection, setPendingRejection] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setJobStatus(profile.job.status);
    setStageId(profile.stage.id);
    setError(null);
    setIsSubmitting(false);
    setPendingRejection(false);
    setIsLoading(true);

    void api.jobs
      .pipeline(profile.job.id)
      .then((pipeline) => {
        setStages(
          pipeline.stages.map((stage) => ({ id: stage.id, name: stage.name })),
        );
        if (pipeline.status) {
          setJobStatus(pipeline.status);
        }
      })
      .catch(() => {
        setStages([profile.stage]);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, profile.job.id, profile.job.status, profile.stage]);

  if (!isOpen) return null;

  const saveChange = async (rejection?: {
    rejectionReasonId?: string;
    rejectionNote?: string;
    talentPoolTagIds?: string[];
  }) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (jobStatus !== profile.job.status) {
        await api.jobs.update(profile.job.id, { status: jobStatus });
      }

      if (stageId !== profile.stage.id) {
        await api.candidates.updateStage(profile.id, stageId, rejection);
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
              Статус вакансії та етап
            </p>
            <h2 id="edit-vacancy-title" className="text-lg font-semibold text-foreground">
              {profile.job.title}
            </h2>
            <p className="mt-1 text-sm text-muted">{profile.name}</p>
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
                  <label htmlFor="edit-vacancy-status" className={formLabelClassName}>
                    Статус вакансії
                  </label>
                  <select
                    id="edit-vacancy-status"
                    className={formControlClassName}
                    value={jobStatus}
                    onChange={(event) => setJobStatus(event.target.value as JobStatus)}
                  >
                    {JOB_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="edit-vacancy-stage" className={formLabelClassName}>
                    Етап кандидата
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
