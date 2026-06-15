import type { Candidate } from "@prisma/client";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { candidateDndId } from "@/lib/pipeline-utils";

type CandidateCardProps = {
  candidate: Candidate;
  onSelect: (candidate: Candidate) => void;
  isDragging?: boolean;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (!dragging) onSelect(candidate);
      }}
      className={`group cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow active:cursor-grabbing ${
        dragging
          ? "opacity-40 shadow-none"
          : "hover:border-primary/30 hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {getInitials(candidate.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {candidate.name}
          </p>
          <p className="truncate text-xs text-muted">{candidate.email}</p>
          {candidate.phone && (
            <p className="mt-1 truncate text-xs text-muted">{candidate.phone}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function CandidateCardPreview({ candidate }: { candidate: Candidate }) {
  return (
    <div className="w-[280px] rotate-2 cursor-grabbing rounded-lg border border-primary/30 bg-card p-3 shadow-lg ring-2 ring-primary/20">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {getInitials(candidate.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{candidate.name}</p>
          <p className="truncate text-xs text-muted">{candidate.email}</p>
        </div>
      </div>
    </div>
  );
}
