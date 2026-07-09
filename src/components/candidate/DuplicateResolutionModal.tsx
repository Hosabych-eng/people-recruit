"use client";

import type { CandidateDuplicateHistory, CandidateWithRelations } from "@/types";
import { Button } from "@/components/ui/Button";
import { DuplicateCandidatePanel } from "@/components/candidate/DuplicateCandidatePanel";

type DuplicateResolutionModalProps = {
  isOpen: boolean;
  candidate: CandidateWithRelations;
  history: CandidateDuplicateHistory;
  jobId: string;
  stageId: string;
  pendingProfile?: {
    name?: string;
    email?: string;
    phone?: string;
    resumeLink?: string;
  };
  onClose: () => void;
  onResolved: () => void;
};

export function DuplicateResolutionModal({
  isOpen,
  candidate,
  history,
  jobId,
  stageId,
  pendingProfile,
  onClose,
  onResolved,
}: DuplicateResolutionModalProps) {
  if (!isOpen) return null;

  const linkToVacancy = async (updateProfile: boolean) => {
    const response = await fetch(`/api/candidates/${candidate.id}/link-application`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        stageId,
        updateProfile: updateProfile ? pendingProfile : undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to link candidate");
    }
    onResolved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-foreground">Candidate already exists</h2>
        <p className="mt-1 text-sm text-muted">
          Would you like to update their profile or link them to this vacancy?
        </p>

        <div className="mt-4">
          <DuplicateCandidatePanel candidate={candidate} history={history} />
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void linkToVacancy(false).catch((err) => alert(err.message))}
          >
            Link to vacancy
          </Button>
          <Button
            type="button"
            onClick={() => void linkToVacancy(true).catch((err) => alert(err.message))}
          >
            Update profile & link
          </Button>
        </div>
      </div>
    </div>
  );
}
