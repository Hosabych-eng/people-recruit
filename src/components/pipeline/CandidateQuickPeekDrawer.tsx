"use client";

import { useEffect, useState } from "react";
import type { CandidateProfile } from "@/types";
import { CandidateProfileView } from "@/components/candidate/CandidateProfileView";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api/client";

type CandidateQuickPeekDrawerProps = {
  candidateId: string | null;
  isOpen: boolean;
  blindHiring: boolean;
  onClose: () => void;
  jobId: string;
};

export function CandidateQuickPeekDrawer({
  candidateId,
  isOpen,
  blindHiring,
  onClose,
  jobId: _jobId,
}: CandidateQuickPeekDrawerProps) {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !candidateId) {
      setProfile(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    void api.candidates
      .profile(candidateId)
      .then(setProfile)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load candidate profile"),
      )
      .finally(() => setIsLoading(false));
  }, [candidateId, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-[92vw] max-w-7xl flex-col border-l border-border bg-background shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        ) : error ? (
          <div className="m-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : profile ? (
          <CandidateProfileView
            profile={profile}
            variant="drawer"
            onClose={onClose}
            blindHiring={blindHiring}
          />
        ) : null}
      </aside>
    </div>
  );
}
