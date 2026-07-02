"use client";

import type { PipelineCandidate } from "@/types";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { getAvatarColors, getInitials } from "@/lib/avatar-colors";
import { formatRelativeTimeUk } from "@/lib/format-relative-time";
import { candidateDndId } from "@/lib/pipeline-utils";

type CandidateCardProps = {
  candidate: PipelineCandidate;
  onSelect: (candidate: PipelineCandidate) => void;
  isDragging?: boolean;
};

function formatSalary(candidate: PipelineCandidate) {
  if (candidate.expectedSalary == null) return null;

  const currency = candidate.salaryCurrency ?? "USD";
  const amount = candidate.expectedSalary.toLocaleString("uk-UA");

  if (currency === "USD") {
    return { display: `$${amount}`, badge: "USD" };
  }

  return { display: amount, badge: currency };
}

function CvIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 ${active ? "text-primary" : "text-muted/50"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M10 13h4M10 17h4M8 13h.01M8 17h.01" />
    </svg>
  );
}

function CommentIcon({ count }: { count: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1 ${count > 0 ? "text-primary" : "text-muted/50"}`}
      title={count > 0 ? `${count} коментар${count === 1 ? "" : count < 5 ? "і" : "ів"}` : "Немає коментарів"}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M21 15a2 2 0 0 1-2 2H8l-5 3V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
      </svg>
      {count > 0 && (
        <span className="text-[11px] font-medium leading-none">{count}</span>
      )}
    </span>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-muted/50"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 7 10-7" />
    </svg>
  );
}

export function CandidateCard({
  candidate,
  onSelect,
  isDragging = false,
}: CandidateCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isActiveDrag } =
    useDraggable({
      id: candidateDndId(candidate.id),
      data: { candidateId: candidate.id, type: "candidate" },
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const dragging = isDragging || isActiveDrag;
  const noteCount = candidate._count.candidateNotes;
  const hasCv = Boolean(candidate.resumeLink);
  const avatar = getAvatarColors(candidate.id);
  const salary = formatSalary(candidate);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (!dragging) onSelect(candidate);
      }}
      className={`group relative cursor-grab rounded-xl border border-border bg-card p-3 shadow-sm transition-all active:cursor-grabbing ${
        dragging
          ? "opacity-40 shadow-none"
          : "hover:border-primary/30 hover:shadow-md"
      }`}
    >
      {Boolean(candidate.isNew) && (
        <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
          Новий
        </span>
      )}

      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatar.bg} ${avatar.text}`}
        >
          {getInitials(candidate.name)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate pr-6 text-sm font-medium text-foreground">
            {candidate.name}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {formatRelativeTimeUk(candidate.createdAt)}
          </p>
        </div>
      </div>

      {salary && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {salary.display}
          </span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            {salary.badge}
          </span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-2.5">
        <div className="flex items-center gap-3">
          <span title={hasCv ? "Резюме прикріплено" : "Резюме відсутнє"}>
            <CvIcon active={hasCv} />
          </span>
          <CommentIcon count={noteCount} />
        </div>
        {candidate.email ? (
          <a
            href={`mailto:${candidate.email}`}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            className="rounded p-0.5 transition-colors hover:text-primary"
            title={`Написати ${candidate.email}`}
            aria-label={`Написати ${candidate.email}`}
          >
            <MailIcon />
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function CandidateCardPreview({ candidate }: { candidate: PipelineCandidate }) {
  const avatar = getAvatarColors(candidate.id);
  const salary = formatSalary(candidate);

  return (
    <div className="w-[300px] rotate-1 cursor-grabbing rounded-xl border border-primary/30 bg-card p-3 shadow-xl ring-2 ring-primary/20">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatar.bg} ${avatar.text}`}
        >
          {getInitials(candidate.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{candidate.name}</p>
          <p className="text-xs text-muted">
            {formatRelativeTimeUk(candidate.createdAt)}
          </p>
        </div>
      </div>
      {salary && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm font-semibold">{salary.display}</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted">
            {salary.badge}
          </span>
        </div>
      )}
    </div>
  );
}
