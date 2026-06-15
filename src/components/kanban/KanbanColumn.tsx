import type { Candidate } from "@prisma/client";
import type { StageWithCandidates } from "@/types";
import { useDroppable } from "@dnd-kit/core";
import { CandidateCard } from "@/components/kanban/CandidateCard";
import { stageDndId } from "@/lib/pipeline-utils";

const columnAccents = [
  "border-t-blue-500",
  "border-t-violet-500",
  "border-t-amber-500",
  "border-t-emerald-500",
  "border-t-rose-500",
];

type KanbanColumnProps = {
  stage: StageWithCandidates;
  index: number;
  onSelectCandidate: (candidate: Candidate) => void;
};

export function KanbanColumn({
  stage,
  index,
  onSelectCandidate,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stageDndId(stage.id),
    data: { stageId: stage.id, type: "stage" },
  });

  const accent = columnAccents[index % columnAccents.length];

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div
        className={`mb-3 rounded-t-lg border-t-4 ${accent} bg-card px-3 py-3 shadow-sm`}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{stage.name}</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-muted">
            {stage.candidates.length}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[420px] flex-1 flex-col gap-2 rounded-b-lg border border-border bg-slate-50/80 p-2 transition-colors ${
          isOver ? "border-primary/40 bg-primary/5 ring-2 ring-primary/10" : ""
        }`}
      >
        {stage.candidates.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border p-4 text-center text-xs text-muted">
            Drop candidates here
          </div>
        ) : (
          stage.candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onSelect={onSelectCandidate}
            />
          ))
        )}
      </div>
    </div>
  );
}
