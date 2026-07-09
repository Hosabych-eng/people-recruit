"use client";

import { useEffect, useState } from "react";
import type { PipelineCandidate } from "@/types";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { maskCandidateName } from "@/lib/blind-hiring";

type CompareRow = {
  id: string;
  name: string;
  skills: string[];
  expectedSalary: number | null;
  salaryCurrency: string | null;
  evaluationAverage: number | null;
  position: string | null;
  experienceYears: number | null;
};

type CandidateCompareModalProps = {
  isOpen: boolean;
  candidates: PipelineCandidate[];
  blindHiring: boolean;
  onClose: () => void;
};

export function CandidateCompareModal({
  isOpen,
  candidates,
  blindHiring,
  onClose,
}: CandidateCompareModalProps) {
  const [rows, setRows] = useState<CompareRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || candidates.length === 0) return;
    setIsLoading(true);

    void Promise.all(
      candidates.map(async (candidate) => {
        const response = await fetch(`/api/candidates/${candidate.id}/profile`);
        const profile = await response.json();
        return {
          id: candidate.id,
          name: blindHiring
            ? maskCandidateName(candidate.name, candidate.id)
            : candidate.name,
          skills: candidate.skills ?? profile.skills ?? [],
          expectedSalary: candidate.expectedSalary ?? profile.expectedSalary ?? null,
          salaryCurrency: candidate.salaryCurrency ?? profile.salaryCurrency ?? null,
          evaluationAverage:
            candidate.evaluationAverage ?? profile.evaluationAverage ?? null,
          position: profile.position ?? null,
          experienceYears: profile.experienceYears ?? null,
        } satisfies CompareRow;
      }),
    )
      .then(setRows)
      .finally(() => setIsLoading(false));
  }, [blindHiring, candidates, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold">Compare candidates</h2>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-3 font-medium text-muted">Field</th>
                {rows.map((row) => (
                  <th key={row.id} className="p-3 font-semibold text-foreground">
                    {row.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: "Skills",
                  render: (row: CompareRow) => row.skills.join(", ") || "—",
                },
                {
                  label: "Salary",
                  render: (row: CompareRow) =>
                    row.expectedSalary != null
                      ? `${row.expectedSalary} ${row.salaryCurrency ?? "USD"}`
                      : "—",
                },
                {
                  label: "Scorecard avg",
                  render: (row: CompareRow) =>
                    row.evaluationAverage != null
                      ? `${row.evaluationAverage.toFixed(1)}/5`
                      : "—",
                },
                {
                  label: "Position",
                  render: (row: CompareRow) => row.position ?? "—",
                },
                {
                  label: "Experience (years)",
                  render: (row: CompareRow) =>
                    row.experienceYears != null ? String(row.experienceYears) : "—",
                },
              ].map((field) => (
                <tr key={field.label} className="border-b border-border/70">
                  <td className="p-3 font-medium text-muted">{field.label}</td>
                  {rows.map((row) => (
                    <td key={`${field.label}-${row.id}`} className="p-3 text-foreground">
                      {field.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
