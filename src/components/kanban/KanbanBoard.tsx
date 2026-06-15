"use client";

import { useCallback, useState } from "react";
import type { Candidate } from "@prisma/client";
import type { JobWithPipeline } from "@/types";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import {
  CandidateCardPreview,
} from "@/components/kanban/CandidateCard";
import { api } from "@/lib/api/client";
import {
  CANDIDATE_PREFIX,
  findCandidateInPipeline,
  getCandidateStageId,
  moveCandidateBetweenStages,
  resolveTargetStageId,
} from "@/lib/pipeline-utils";

type KanbanBoardProps = {
  pipeline: JobWithPipeline;
  onPipelineChange: (pipeline: JobWithPipeline) => void;
  onSelectCandidate: (candidate: Candidate) => void;
  onError: (message: string) => void;
};

export function KanbanBoard({
  pipeline,
  onPipelineChange,
  onSelectCandidate,
  onError,
}: KanbanBoardProps) {
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const activeId = String(event.active.id);
      if (!activeId.startsWith(CANDIDATE_PREFIX)) return;

      const candidateId = activeId.slice(CANDIDATE_PREFIX.length);
      const candidate = findCandidateInPipeline(pipeline, candidateId);
      setActiveCandidate(candidate);
    },
    [pipeline],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveCandidate(null);

      const { active, over } = event;
      if (!over) return;

      const activeId = String(active.id);
      if (!activeId.startsWith(CANDIDATE_PREFIX)) return;

      const candidateId = activeId.slice(CANDIDATE_PREFIX.length);
      const sourceStageId = getCandidateStageId(pipeline, candidateId);
      const targetStageId = resolveTargetStageId(pipeline, String(over.id));

      if (!sourceStageId || !targetStageId || sourceStageId === targetStageId) {
        return;
      }

      const previousPipeline = pipeline;
      const optimisticPipeline = moveCandidateBetweenStages(
        pipeline,
        candidateId,
        targetStageId,
      );

      onPipelineChange(optimisticPipeline);
      setIsUpdating(true);

      try {
        await api.candidates.updateStage(candidateId, targetStageId);
      } catch (error) {
        onPipelineChange(previousPipeline);
        onError(
          error instanceof Error
            ? error.message
            : "Failed to update candidate stage",
        );
      } finally {
        setIsUpdating(false);
      }
    },
    [onError, onPipelineChange, pipeline],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="relative">
        {isUpdating && (
          <div className="absolute right-0 top-0 z-10 rounded-full bg-card px-3 py-1 text-xs text-muted shadow-sm ring-1 ring-border">
            Saving…
          </div>
        )}

        <div className="flex gap-4 overflow-x-auto pb-4">
          {pipeline.stages.map((stage, index) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              index={index}
              onSelectCandidate={onSelectCandidate}
            />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeCandidate ? (
          <CandidateCardPreview candidate={activeCandidate} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
