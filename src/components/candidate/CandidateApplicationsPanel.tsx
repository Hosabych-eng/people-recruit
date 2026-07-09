"use client";

import { useEffect, useMemo, useState } from "react";
import type { CandidateProfile } from "@/types";
import { RejectionReasonModal } from "@/components/candidate/RejectionReasonModal";
import { Button } from "@/components/ui/Button";
import { formControlClassName } from "@/components/ui/formStyles";
import { isRejectedStageName } from "@/lib/pipeline-utils";
import { api } from "@/lib/api/client";

type CandidateApplicationsPanelProps = {
  profile: CandidateProfile;
  onProfileChange: (profile: CandidateProfile) => void;
};

type JobOption = {
  id: string;
  title: string;
  stages: { id: string; name: string }[];
};

export function CandidateApplicationsPanel({
  profile,
  onProfileChange,
}: CandidateApplicationsPanelProps) {
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [stageMap, setStageMap] = useState<Record<string, { id: string; name: string }[]>>({});
  const [newJobId, setNewJobId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingStageChange, setPendingStageChange] = useState<{
    applicationId: string;
    stageId: string;
  } | null>(null);

  const appliedJobIds = useMemo(
    () => new Set(profile.applications.map((row) => row.job.id)),
    [profile.applications],
  );

  const availableJobs = useMemo(
    () => jobs.filter((job) => !appliedJobIds.has(job.id)),
    [jobs, appliedJobIds],
  );

  useEffect(() => {
    void api.jobs
      .list()
      .then((data) => {
        const mapped = data.map((job) => ({
          id: job.id,
          title: job.title,
          stages: job.stages ?? [],
        }));
        setJobs(mapped);
        setStageMap(Object.fromEntries(mapped.map((job) => [job.id, job.stages])));
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Не вдалося завантажити вакансії"),
      );
  }, []);

  useEffect(() => {
    const missingJobIds = [
      ...new Set(
        profile.applications
          .map((row) => row.job.id)
          .filter((jobId) => !stageMap[jobId]?.length),
      ),
    ];
    if (missingJobIds.length === 0) return;

    void Promise.all(
      missingJobIds.map((jobId) =>
        api.jobs.pipeline(jobId).then((pipeline) => ({
          jobId,
          stages: pipeline.stages.map((stage) => ({ id: stage.id, name: stage.name })),
        })),
      ),
    )
      .then((rows) => {
        setStageMap((current) => ({
          ...current,
          ...Object.fromEntries(rows.map((row) => [row.jobId, row.stages])),
        }));
      })
      .catch(() => undefined);
  }, [profile.applications, stageMap]);

  const getStagesForJob = (jobId: string) => stageMap[jobId] ?? [];

  const handleAddApplication = async () => {
    if (!newJobId) return;
    setError(null);

    let stages = getStagesForJob(newJobId);
    if (stages.length === 0) {
      try {
        const pipeline = await api.jobs.pipeline(newJobId);
        stages = pipeline.stages.map((stage) => ({ id: stage.id, name: stage.name }));
        setStageMap((current) => ({ ...current, [newJobId]: stages }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не вдалося завантажити етапи воронки");
        return;
      }
    }

    const stageId = stages[0]?.id;
    if (!stageId) {
      setError("У вакансії немає етапів воронки");
      return;
    }

    const response = await fetch(`/api/candidates/${profile.id}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: newJobId, stageId }),
    });
    const application = await response.json();
    if (!response.ok) {
      setError(application.error ?? "Не вдалося додати заявку");
      return;
    }

    onProfileChange({
      ...profile,
      applications: [application, ...profile.applications],
    });
    setNewJobId("");
  };

  const handleStageChange = async (
    applicationId: string,
    stageId: string,
    rejection?: { rejectionReasonId: string; rejectionNote: string },
  ) => {
    const response = await fetch(`/api/candidates/${profile.id}/applications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, stageId, ...rejection }),
    });
    const updated = await response.json();
    if (!response.ok) {
      throw new Error(updated.error ?? "Не вдалося оновити етап");
    }

    const refreshed = await api.candidates.profile(profile.id);
    onProfileChange(refreshed);
  };

  const requestStageChange = (applicationId: string, stageId: string) => {
    const application = profile.applications.find((row) => row.id === applicationId);
    const stage = getStagesForJob(application?.job.id ?? "").find((item) => item.id === stageId);

    if (stage && isRejectedStageName(stage.name)) {
      setPendingStageChange({ applicationId, stageId });
      return;
    }

    void handleStageChange(applicationId, stageId).catch((err) =>
      setError(err instanceof Error ? err.message : "Не вдалося оновити етап"),
    );
  };

  return (
    <>
      <section className="rounded-lg border border-border bg-card p-3 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold">Вакансії та етапи воронки</h3>
        <p className="mb-3 text-xs text-muted">
          Керуйте всіма заявками кандидата, переміщеннями між етапами та історією воронки.
        </p>

        {error && (
          <p className="mb-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">
            {error}
          </p>
        )}

        <div className="mb-3 flex gap-2">
          <select
            className={formControlClassName}
            value={newJobId}
            onChange={(e) => setNewJobId(e.target.value)}
          >
            <option value="">Обрати вакансію…</option>
            {availableJobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            disabled={!newJobId}
            onClick={() => void handleAddApplication()}
          >
            Додати
          </Button>
        </div>

        <ul className="space-y-2">
          {profile.applications.map((row) => (
            <li
              key={row.id}
              className="rounded border border-border px-3 py-2 text-xs"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate font-medium text-foreground">{row.job.title}</span>
                {row.job.id === profile.job.id && (
                  <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    Основна
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted">Етап:</span>
                <select
                  className="h-7 flex-1 rounded border border-border px-2 text-[11px]"
                  value={row.stage.id}
                  onChange={(e) => requestStageChange(row.id, e.target.value)}
                >
                  {getStagesForJob(row.job.id).map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-[10px] text-muted">
                Додано: {new Date(row.createdAt).toLocaleDateString("uk-UA")}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <RejectionReasonModal
        candidateName={profile.name}
        isOpen={Boolean(pendingStageChange)}
        onClose={() => setPendingStageChange(null)}
        onConfirm={async (input) => {
          if (!pendingStageChange) return;
          await handleStageChange(
            pendingStageChange.applicationId,
            pendingStageChange.stageId,
            input,
          );
          setPendingStageChange(null);
        }}
      />
    </>
  );
}
