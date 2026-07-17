"use client";

import { useEffect, useState } from "react";
import type { CandidateProfile } from "@/types";
import { RejectionReasonModal } from "@/components/candidate/RejectionReasonModal";
import { formControlClassName } from "@/components/ui/formStyles";
import { isRejectedStageName } from "@/lib/pipeline-utils";
import { api } from "@/lib/api/client";

type CandidateStageSelectorProps = {
  profile: CandidateProfile;
  onProfileChange: (profile: CandidateProfile) => void;
};

export function CandidateStageSelector({
  profile,
  onProfileChange,
}: CandidateStageSelectorProps) {
  const [stages, setStages] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingStageId, setPendingStageId] = useState<string | null>(null);

  useEffect(() => {
    void api.stages
      .list(profile.job.id)
      .then((rows) => setStages(rows.map((row) => ({ id: row.id, name: row.name }))))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Не вдалося завантажити етапи"),
      );
  }, [profile.job.id]);

  const applyStageChange = async (
    stageId: string,
    rejection?: { rejectionReasonId?: string; rejectionNote?: string; talentPoolTagIds?: string[] },
  ) => {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await api.candidates.updateStage(profile.id, stageId, rejection);
      const stageName =
        stages.find((stage) => stage.id === stageId)?.name ?? profile.stage.name;

      onProfileChange({
        ...profile,
        stage: { id: stageId, name: stageName },
        applications: profile.applications.map((row) =>
          row.job.id === profile.job.id
            ? {
                ...row,
                stageId,
                stage: { id: stageId, name: stageName },
              }
            : row,
        ),
        score: updated.score ?? profile.score,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося змінити етап");
    } finally {
      setIsSaving(false);
      setPendingStageId(null);
    }
  };

  const handleChange = (stageId: string) => {
    if (stageId === profile.stage.id || isSaving) return;
    const stageName = stages.find((stage) => stage.id === stageId)?.name ?? "";
    if (isRejectedStageName(stageName)) {
      setPendingStageId(stageId);
      return;
    }
    void applyStageChange(stageId);
  };

  return (
    <section className="rounded-lg border border-border bg-card p-2.5 shadow-sm">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Етап кандидата
      </h3>
      <select
        className={`${formControlClassName} text-xs`}
        value={profile.stage.id}
        disabled={isSaving || stages.length === 0}
        onChange={(event) => handleChange(event.target.value)}
      >
        {stages.length === 0 ? (
          <option value={profile.stage.id}>{profile.stage.name}</option>
        ) : (
          stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))
        )}
      </select>
      <p className="mt-1.5 text-[11px] text-muted">
        Зміна застосовується одразу (без drag-and-drop).
      </p>
      {error && <p className="mt-1 text-[10px] text-red-600">{error}</p>}

      <RejectionReasonModal
        candidateName={profile.name}
        isOpen={Boolean(pendingStageId)}
        onClose={() => setPendingStageId(null)}
        onConfirm={async (input) => {
          if (!pendingStageId) return;
          await applyStageChange(pendingStageId, input);
        }}
      />
    </section>
  );
}
