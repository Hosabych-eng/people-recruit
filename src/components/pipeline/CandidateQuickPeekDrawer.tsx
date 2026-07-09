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

function isValidResumePreviewUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;

  const trimmed = url.trim();

  if (trimmed.startsWith("/api/candidates/")) return true;

  const lower = trimmed.toLowerCase();
  if (lower.includes("example.com")) return false;

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname === "example.com" || parsed.hostname.endsWith(".example.com")) {
      return false;
    }
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function resolveResumePreviewUrl(
  profile: CandidateProfile,
  resumeDoc: CandidateProfile["documents"][number] | undefined,
): string | null {
  if (resumeDoc) {
    return `/api/candidates/${profile.id}/documents/${resumeDoc.id}`;
  }

  const link = profile.resumeLink?.trim();
  if (!link || !isValidResumePreviewUrl(link)) return null;

  return link;
}

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
    () =>
      profile?.documents.find((doc) => doc.category === "RESUME") ??
      profile?.documents.find((doc) => doc.category === "PORTFOLIO"),
    [profile],
  );

  const resumePreviewUrl = useMemo(
    () => (profile ? resolveResumePreviewUrl(profile, resumeDoc) : null),
    [profile, resumeDoc],
  );

  if (!isOpen) return null;

  const displayName =
    blindHiring && profile
      ? maskCandidateName(profile.name, profile.id)
      : profile?.name ?? "Candidate";

  const skills = (profile as CandidateProfile & { skills?: string[] })?.skills ?? [];

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
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-5xl flex-col border-l border-border bg-background shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border bg-card px-6 py-5">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              Quick Peek
            </p>
            <h2 className="truncate text-xl font-semibold text-foreground">{displayName}</h2>
            {profile && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {profile.stage.name}
                </span>
                <span className="text-xs text-muted">{profile.job.title}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            aria-label="Close quick peek"
            className="rounded-lg p-2 text-muted transition-colors hover:bg-slate-100 hover:text-foreground"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </header>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="h-7 w-7" />
          </div>
        ) : error ? (
          <div className="m-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : profile ? (
          <div className="grid flex-1 gap-5 overflow-y-auto p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="space-y-5">
              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-foreground">Contact & role</h3>
                <dl className="mt-4 grid gap-3 text-sm">
                  <DetailRow label="Email" value={blindHiring ? "—" : profile.email} />
                  <DetailRow label="Phone" value={blindHiring ? "—" : profile.phone} />
                  <DetailRow
                    label="Position"
                    value={profile.position ?? profile.job.title}
                  />
                  <DetailRow label="Stage" value={profile.stage.name} />
                  {profile.expectedSalary != null && (
                    <DetailRow
                      label="Salary"
                      value={`${profile.expectedSalary.toLocaleString()} ${profile.salaryCurrency ?? "USD"}`}
                    />
                  )}
                </dl>

                {skills.length > 0 && (
                  <div className="mt-5 border-t border-border pt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">
                      Skills
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">Evaluation</h3>
                  {evaluation?.average != null && (
                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
                      ★ {evaluation.average.toFixed(1)} / 5
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <label className={formLabelClassName}>Criteria (comma-separated)</label>
                  <input
                    className={formControlClassName}
                    value={criteriaInput}
                    onChange={(e) => setCriteriaInput(e.target.value)}
                    placeholder="Architecture, Communication, Docker"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={() => void saveCriteria()}>
                    Save criteria
                  </Button>
                </div>

                {evaluation?.criteria?.length ? (
                  <div className="mt-5 space-y-3 border-t border-border pt-4">
                    {evaluation.criteria.map((criterion) => (
                      <div
                        key={criterion.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-slate-50/80 px-3 py-2.5"
                      >
                        <span className="text-sm font-medium text-foreground">{criterion.name}</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button
                              key={value}
                              type="button"
                              aria-label={`Rate ${criterion.name} ${value} out of 5`}
                              onClick={() =>
                                setScoreDraft((current) => ({ ...current, [criterion.id]: value }))
                              }
                              className={`h-7 w-7 rounded-md text-xs font-semibold transition-colors ${
                                (scoreDraft[criterion.id] ?? 0) >= value
                                  ? "bg-amber-400 text-white shadow-sm"
                                  : "bg-white text-muted ring-1 ring-border hover:bg-amber-50"
                              }`}
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <Button type="button" size="sm" onClick={() => void saveScores()}>
                      Save scores
                    </Button>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-muted">
                    Add criteria above to start scoring this candidate.
                  </p>
                )}
              </section>
            </div>

            <section className="flex min-h-[28rem] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">Resume preview</h3>
                {resumeDoc && (
                  <p className="mt-0.5 truncate text-xs text-muted">{resumeDoc.title}</p>
                )}
              </div>

              {resumePreviewUrl ? (
                <iframe
                  title="Resume preview"
                  src={resumePreviewUrl}
                  className="min-h-0 flex-1 w-full bg-white"
                />
              ) : (
                <ResumePlaceholder />
              )}
            </section>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-foreground">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

function ResumePlaceholder() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-50 to-white px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 ring-1 ring-border">
        <DocumentIcon />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">No valid resume attached</p>
        <p className="max-w-xs text-xs leading-relaxed text-muted">
          Upload a PDF resume or add a valid portfolio link to preview it here.
        </p>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}
