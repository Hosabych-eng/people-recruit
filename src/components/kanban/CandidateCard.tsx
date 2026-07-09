"use client";

import type { PipelineCandidate } from "@/types";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CandidateAvatar } from "@/components/ui/CandidateAvatar";
import { getDaysActive } from "@/lib/days-active";
import { maskCandidateName } from "@/lib/blind-hiring";
import { candidateDndId } from "@/lib/pipeline-utils";

const SKILL_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6"];

type CandidateCardProps = {
  candidate: PipelineCandidate;
  onSelect: (candidate: PipelineCandidate) => void;
  isDragging?: boolean;
  isFocused?: boolean;
  blindHiring?: boolean;
  compareSelected?: boolean;
  onToggleCompare?: (candidate: PipelineCandidate) => void;
};

function formatSalary(candidate: PipelineCandidate) {
  if (candidate.expectedSalary == null) return null;
  const currency = candidate.salaryCurrency ?? "USD";
  const amount = candidate.expectedSalary.toLocaleString("uk-UA");
  return currency === "USD" ? `$${amount}` : `${amount} ${currency}`;
}

export function CandidateCard({
  candidate,
  onSelect,
  isDragging = false,
  isFocused = false,
  blindHiring = false,
  compareSelected = false,
  onToggleCompare,
}: CandidateCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isActiveDrag } =
    useDraggable({
      id: candidateDndId(candidate.id),
      data: { candidateId: candidate.id, type: "candidate" },
    });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const dragging = isDragging || isActiveDrag;
  const noteCount = candidate._count.candidateNotes;
  const fileCount = candidate._count.documents ?? 0;
  const salary = formatSalary(candidate);
  const daysAgo = getDaysActive(candidate.createdAt);
  const displayName = blindHiring
    ? maskCandidateName(candidate.name, candidate.id)
    : candidate.name;
  const isDeadlineExpired =
    candidate.testAssignmentDeadline != null &&
    new Date(candidate.testAssignmentDeadline).getTime() < Date.now();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (!dragging) onSelect(candidate);
      }}
      className={`group relative cursor-grab rounded-md border bg-card p-1.5 text-[11px] shadow-sm transition-all active:cursor-grabbing ${
        dragging ? "opacity-40" : "hover:border-primary/30"
      } ${isFocused ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
    >
      {onToggleCompare && (
        <label
          className="absolute right-1 top-1 z-10 flex items-center"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={compareSelected}
            onChange={() => onToggleCompare(candidate)}
            className="h-3 w-3 rounded border-border"
          />
        </label>
      )}
      <div className="flex items-start gap-1.5">
        <CandidateAvatar
          name={displayName}
          avatarUrl={blindHiring ? null : candidate.avatarUrl}
          seed={candidate.id}
          size="sm"
          className="!h-7 !w-7 !text-[10px]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate font-medium leading-tight text-foreground">{displayName}</p>
            {candidate.evaluationAverage != null && (
              <span className="rounded bg-violet-100 px-1 py-0.5 text-[9px] font-semibold text-violet-800">
                ★ {candidate.evaluationAverage.toFixed(1)}
              </span>
            )}
            {candidate.score != null && (
              <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold text-amber-800">
                {candidate.score}/5
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <span className="rounded bg-slate-100 px-1 py-0.5 text-[10px] text-muted">{daysAgo}д</span>
            {salary && <span className="font-semibold text-foreground">{salary}</span>}
            {isDeadlineExpired && (
              <span className="rounded bg-red-100 px-1 py-0.5 text-[9px] font-semibold text-red-700">
                Deadline expired
              </span>
            )}
          </div>
          {candidate.rejectionReason && (
            <span className="mt-1 inline-block rounded bg-red-50 px-1 py-0.5 text-[9px] text-red-700">
              {candidate.rejectionReason.name}
            </span>
          )}
          {candidate.skills && candidate.skills.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-0.5">
              {candidate.skills.slice(0, 3).map((skill, index) => (
                <span
                  key={skill}
                  className="rounded px-1 py-0.5 text-[9px] text-white"
                  style={{ background: SKILL_COLORS[index % SKILL_COLORS.length] }}
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
          {candidate.tags && candidate.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-0.5">
              {candidate.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag.id}
                  className="rounded px-1 py-0.5 text-[9px] text-white"
                  style={{ background: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between border-t border-border/60 pt-1 text-muted">
        <span title="Файли">📎 {fileCount}</span>
        <span title="Коментарі">💬 {noteCount}</span>
      </div>
    </div>
  );
}

export function CandidateCardPreview({ candidate }: { candidate: PipelineCandidate }) {
  return <CandidateCard candidate={candidate} onSelect={() => undefined} isDragging />;
}
