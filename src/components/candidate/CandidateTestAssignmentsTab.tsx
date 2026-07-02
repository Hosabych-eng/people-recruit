"use client";

import { useState } from "react";
import type { CandidateTestAssignment } from "@/types";
import { Button } from "@/components/ui/Button";
import { SendTestAssignmentModal } from "@/components/candidate/SendTestAssignmentModal";
import { formatRelativeTimeUk } from "@/lib/format-relative-time";

type CandidateTestAssignmentsTabProps = {
  candidateId: string;
  candidateName: string;
  assignments: CandidateTestAssignment[];
  onAssignmentSent: (assignment: CandidateTestAssignment) => void;
};

const STATUS_LABELS: Record<CandidateTestAssignment["status"], string> = {
  QUEUED: "У черзі",
  SENT: "Надіслано",
  FAILED: "Помилка",
};

const STATUS_STYLES: Record<CandidateTestAssignment["status"], string> = {
  QUEUED: "bg-slate-100 text-slate-700",
  SENT: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-red-50 text-red-700",
};

export function CandidateTestAssignmentsTab({
  candidateId,
  candidateName,
  assignments,
  onAssignmentSent,
}: CandidateTestAssignmentsTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Тестові завдання</h2>
          <p className="text-sm text-muted">Надіслані кандидату шаблони</p>
        </div>
        <Button size="sm" onClick={() => setIsModalOpen(true)}>
          Надіслати тестове завдання
        </Button>
      </div>

      <div className="divide-y divide-border">
        {assignments.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            Ще не надсилали тестових завдань цьому кандидату.
          </p>
        ) : (
          assignments.map((assignment) => (
            <article key={assignment.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{assignment.templateTitle}</p>
                  <p className="mt-1 text-sm text-muted">{assignment.templateFileName}</p>
                  <p className="mt-2 text-xs text-muted">
                    {assignment.sentByName} ·{" "}
                    {formatRelativeTimeUk(assignment.sentAt ?? assignment.createdAt)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[assignment.status]}`}
                >
                  {STATUS_LABELS[assignment.status]}
                </span>
              </div>
            </article>
          ))
        )}
      </div>

      <SendTestAssignmentModal
        candidateId={candidateId}
        candidateName={candidateName}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSent={onAssignmentSent}
      />
    </div>
  );
}
