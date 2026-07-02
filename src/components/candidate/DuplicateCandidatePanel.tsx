"use client";

import Link from "next/link";
import type { CandidateDuplicateHistory, CandidateWithRelations } from "@/types";
import { Button } from "@/components/ui/Button";

type DuplicateCandidatePanelProps = {
  candidate: CandidateWithRelations;
  history: CandidateDuplicateHistory;
  onClose?: () => void;
};

function formatHistoryDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatAssignmentStatus(status: string) {
  if (status === "QUEUED") return "PENDING";
  return status;
}

export function DuplicateCandidatePanel({
  candidate,
  history,
  onClose,
}: DuplicateCandidatePanelProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold">Candidate already exists in the database!</p>
        <p className="mt-1">
          {candidate.name} · {candidate.email}
          {candidate.resumeLink ? ` · ${candidate.resumeLink}` : ""}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
        <p className="font-medium text-foreground">Історія взаємодії</p>
        <ul className="mt-3 space-y-2 text-muted">
          <li>
            {history.lastEmail ? (
              <>
                Останній лист:{" "}
                <span className="text-foreground">
                  {formatHistoryDate(history.lastEmail.sentAt)} (Статус:{" "}
                  {history.lastEmail.status})
                </span>
              </>
            ) : (
              "Листів ще не надсилали."
            )}
          </li>
          <li>
            {history.lastTestAssignment ? (
              <>
                Тестове завдання:{" "}
                <span className="text-foreground">
                  {history.lastTestAssignment.templateTitle} (Статус:{" "}
                  {formatAssignmentStatus(history.lastTestAssignment.status)})
                </span>
              </>
            ) : (
              "Тестові завдання ще не надсилали."
            )}
          </li>
        </ul>
        <p className="mt-3 text-xs text-muted">
          Вакансія: {candidate.job.title} · Етап: {candidate.stage.name}
        </p>
      </div>

      <div className="flex justify-end gap-3">
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose}>
            Закрити
          </Button>
        )}
        <Link
          href={`/candidates/${candidate.id}`}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Перейти до профілю
        </Link>
      </div>
    </div>
  );
}
