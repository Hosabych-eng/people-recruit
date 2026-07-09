import type { PipelineCandidate, StageWithCandidates } from "@/types";
import type { CandidateSortOrder } from "@/lib/pipeline-utils";
import { useDroppable } from "@dnd-kit/core";
import { CandidateCard } from "@/components/kanban/CandidateCard";
import { sortCandidatesByDate, stageDndId } from "@/lib/pipeline-utils";

const columnAccents = [
  "border-t-blue-500",
  "border-t-violet-500",
  "border-t-amber-500",
  "border-t-emerald-500",
  "border-t-rose-500",
  "border-t-slate-500",
];

type KanbanColumnProps = {
  stage: StageWithCandidates;
  index: number;
  sortOrder: CandidateSortOrder;
  onSelectCandidate: (candidate: PipelineCandidate) => void;
  focusedCandidateId?: string | null;
  blindHiring?: boolean;
  compareSelectedIds?: string[];
  onToggleCompare?: (candidate: PipelineCandidate) => void;
};

export function KanbanColumn({
  stage,
  index,
  sortOrder,
  onSelectCandidate,
  focusedCandidateId,
  blindHiring = false,
  compareSelectedIds = [],
  onToggleCompare,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stageDndId(stage.id),
    data: { stageId: stage.id, type: "stage" },
  });

  const accent = columnAccents[index % columnAccents.length];
  const candidates = sortCandidatesByDate(stage.candidates, sortOrder);

  return (
    <div className="flex w-[300px] shrink-0 flex-col">
      <div
        className={`mb-3 rounded-t-xl border-t-4 ${accent} bg-card px-3.5 py-3 shadow-sm`}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">{stage.name}</h3>
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-muted">
            {stage.candidates.length}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[480px] flex-1 flex-col gap-2.5 rounded-b-xl border border-border bg-slate-50/80 p-2.5 transition-colors ${
          isOver ? "border-primary/40 bg-primary/5 ring-2 ring-primary/10" : ""
        }`}
      >
        {candidates.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted">
            Перетягніть кандидатів сюди
          </div>
        ) : (
          candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onSelect={onSelectCandidate}
              isFocused={focusedCandidateId === candidate.id}
              blindHiring={blindHiring}
              compareSelected={compareSelectedIds.includes(candidate.id)}
              onToggleCompare={onToggleCompare}
            />
          ))
        )}
      </div>
    </div>
  );
}
