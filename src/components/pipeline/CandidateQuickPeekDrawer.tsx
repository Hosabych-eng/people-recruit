"use client";

import { useEffect, useMemo, useState } from "react";
import type { CandidateProfile } from "@/types";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";
import { api } from "@/lib/api/client";
import { maskCandidateName } from "@/lib/blind-hiring";

type CandidateQuickPeekDrawerProps = {
  candidateId: string | null;
  isOpen: boolean;
  blindHiring: boolean;
  onClose: () => void;
  jobId: string;
};

type EvaluationState = {
  average: number | null;
  criteria: { id: string; name: string; sortOrder: number }[];
  scores: { criterionId: string; criterionName: string; score: number }[];
};

export function CandidateQuickPeekDrawer({
  candidateId,
  isOpen,
  blindHiring,
  onClose,
  jobId,
}: CandidateQuickPeekDrawerProps) {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationState | null>(null);
  const [criteriaInput, setCriteriaInput] = useState("");
  const [scoreDraft, setScoreDraft] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !candidateId) return;
    setIsLoading(true);
    setError(null);

    void Promise.all([
      api.candidates.profile(candidateId),
      fetch(`/api/candidates/${candidateId}/evaluation`).then((r) => r.json()),
    ])
      .then(([profileData, evaluationData]) => {
        setProfile(profileData);
        setEvaluation(evaluationData);
        setScoreDraft(
          Object.fromEntries(
            (evaluationData.scores ?? []).map((row: { criterionId: string; score: number }) => [
              row.criterionId,
              row.score,
            ]),
          ),
        );
        setCriteriaInput(
          (evaluationData.criteria ?? [])
            .map((row: { name: string }) => row.name)
            .join(", "),
        );
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load candidate"),
      )
      .finally(() => setIsLoading(false));
  }, [candidateId, isOpen]);

  const resumeDoc = useMemo(
    () => profile?.documents.find((doc) => doc.category === "RESUME"),
    [profile],
  );

  const resumeUrl = resumeDoc
    ? `/api/candidates/${profile?.id}/documents/${resumeDoc.id}`
    : profile?.resumeLink;

  if (!isOpen) return null;

  const displayName =
    blindHiring && profile
      ? maskCandidateName(profile.name, profile.id)
      : profile?.name ?? "Candidate";

  const saveCriteria = async () => {
    const criteria = criteriaInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const response = await fetch(`/api/jobs/${jobId}/evaluation`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ criteria }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Failed to save criteria");
    setEvaluation((current) => ({ ...(current ?? { average: null, scores: [] }), criteria: payload }));
  };

  const saveScores = async () => {
    if (!candidateId || !evaluation) return;
    const scores = evaluation.criteria.map((criterion) => ({
      criterionId: criterion.id,
      score: scoreDraft[criterion.id] ?? 0,
    }));
    const response = await fetch(`/api/candidates/${candidateId}/evaluation`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scores }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Failed to save scores");
    setEvaluation((current) => ({ ...(current ?? { criteria: [], scores: [] }), average: payload.average }));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-5xl flex-col border-l border-border bg-card shadow-2xl transition-transform duration-300"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Quick Peek</p>
            <h2 className="text-lg font-semibold text-foreground">{displayName}</h2>
          </div>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-muted hover:bg-slate-100"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : error ? (
          <div className="p-5 text-sm text-red-600">{error}</div>
        ) : profile ? (
          <div className="grid flex-1 gap-4 overflow-y-auto p-5 lg:grid-cols-2">
            <section className="space-y-3">
              <div className="rounded-lg border border-border p-3 text-sm">
                <p><span className="text-muted">Email:</span> {blindHiring ? "—" : profile.email ?? "—"}</p>
                <p><span className="text-muted">Phone:</span> {blindHiring ? "—" : profile.phone ?? "—"}</p>
                <p><span className="text-muted">Position:</span> {profile.position ?? profile.job.title}</p>
                <p><span className="text-muted">Stage:</span> {profile.stage.name}</p>
                {profile.skills?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(profile as CandidateProfile & { skills?: string[] }).skills?.map((skill) => (
                      <span key={skill} className="rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-border p-3">
                <h3 className="mb-2 text-sm font-semibold">Evaluation</h3>
                <label className={formLabelClassName}>Criteria (comma-separated)</label>
                <input
                  className={formControlClassName}
                  value={criteriaInput}
                  onChange={(e) => setCriteriaInput(e.target.value)}
                />
                <Button type="button" size="sm" className="mt-2" onClick={() => void saveCriteria()}>
                  Save Criteria
                </Button>

                {evaluation?.criteria?.length ? (
                  <div className="mt-3 space-y-2">
                    {evaluation.criteria.map((criterion) => (
                      <div key={criterion.id} className="flex items-center justify-between gap-2 text-xs">
                        <span>{criterion.name}</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                setScoreDraft((current) => ({ ...current, [criterion.id]: value }))
                              }
                              className={`h-6 w-6 rounded text-[10px] ${
                                (scoreDraft[criterion.id] ?? 0) >= value
                                  ? "bg-amber-400 text-white"
                                  : "bg-slate-100 text-muted"
                              }`}
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <Button type="button" size="sm" onClick={() => void saveScores()}>
                      Save Scores
                    </Button>
                    {evaluation.average != null && (
                      <p className="text-xs text-muted">Average: {evaluation.average.toFixed(1)}/5</p>
                    )}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="min-h-[28rem] rounded-lg border border-border">
              {resumeUrl ? (
                <iframe title="Resume preview" src={resumeUrl} className="h-full min-h-[28rem] w-full rounded-lg" />
              ) : (
                <div className="flex h-full min-h-[28rem] items-center justify-center text-sm text-muted">
                  No resume available
                </div>
              )}
            </section>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
