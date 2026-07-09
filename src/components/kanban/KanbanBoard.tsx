"use client";

import { useCallback, useState } from "react";
import type { PipelineCandidate } from "@/types";
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
import { CandidateCardPreview } from "@/components/kanban/CandidateCard";
import { RejectionReasonModal } from "@/components/candidate/RejectionReasonModal";
import { StageEmailConfirmModal } from "@/components/pipeline/StageEmailConfirmModal";
import { api } from "@/lib/api/client";
import {
  CANDIDATE_PREFIX,
  findCandidateInPipeline,
  getCandidateStageId,
  isRejectedStageName,
  moveCandidateBetweenStages,
  resolveTargetStageId,
  type CandidateSortOrder,
} from "@/lib/pipeline-utils";
import { isOfferedStageName } from "@/lib/stage-mapping";

type KanbanBoardProps = {
  pipeline: JobWithPipeline;
  fullPipeline: JobWithPipeline;
  sortOrder: CandidateSortOrder;
  onPipelineChange: (pipeline: JobWithPipeline) => void;
  onSelectCandidate: (candidate: PipelineCandidate) => void;
  onError: (message: string) => void;
  focusedCandidateId?: string | null;
  blindHiring?: boolean;
  compareSelectedIds?: string[];
  onToggleCompare?: (candidate: PipelineCandidate) => void;
  recruiterName?: string;
};

type PendingRejection = {
  candidateId: string;
  candidateName: string;
  targetStageId: string;
  previousPipeline: JobWithPipeline;
};

type PendingEmail = {
  candidateId: string;
  candidateName: string;
  candidateEmail?: string | null;
  kind: "offered" | "rejected";
};

export function KanbanBoard({
  pipeline,
  fullPipeline,
  sortOrder,
  onPipelineChange,
  onSelectCandidate,
  onError,
  focusedCandidateId,
  blindHiring = false,
  compareSelectedIds = [],
  onToggleCompare,
  recruiterName = "Recruiter",
}: KanbanBoardProps) {
  const [activeCandidate, setActiveCandidate] = useState<PipelineCandidate | null>(
    null,
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingRejection, setPendingRejection] = useState<PendingRejection | null>(
    null,
  );
  const [pendingEmail, setPendingEmail] = useState<PendingEmail | null>(null);

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
      const candidate = findCandidateInPipeline(fullPipeline, candidateId);
      setActiveCandidate(candidate);
    },
    [fullPipeline],
  );

  const queueEmailConfirm = useCallback(
    (candidateId: string, targetStageId: string) => {
      const candidate = findCandidateInPipeline(fullPipeline, candidateId);
      const targetStage = fullPipeline.stages.find((stage) => stage.id === targetStageId);
      if (!candidate || !targetStage) return;

      if (isRejectedStageName(targetStage.name)) {
        setPendingEmail({
          candidateId,
          candidateName: candidate.name,
          candidateEmail: candidate.email,
          kind: "rejected",
        });
        return;
      }

      if (isOfferedStageName(targetStage.name)) {
        setPendingEmail({
          candidateId,
          candidateName: candidate.name,
          candidateEmail: candidate.email,
          kind: "offered",
        });
      }
    },
    [fullPipeline],
  );

  const completeStageMove = useCallback(
    async (
      candidateId: string,
      targetStageId: string,
      previousPipeline: JobWithPipeline,
      rejection?: {
        rejectionReasonId: string;
        rejectionNote: string;
        talentPoolTagIds?: string[];
      },
      options?: { skipEmailPrompt?: boolean },
    ) => {
      setIsUpdating(true);
      try {
        await api.candidates.updateStage(candidateId, targetStageId, rejection);
        if (!options?.skipEmailPrompt) {
          queueEmailConfirm(candidateId, targetStageId);
        }
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
    [onError, onPipelineChange, queueEmailConfirm],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveCandidate(null);

      const { active, over } = event;
      if (!over) return;

      const activeId = String(active.id);
      if (!activeId.startsWith(CANDIDATE_PREFIX)) return;

      const candidateId = activeId.slice(CANDIDATE_PREFIX.length);
      const sourceStageId = getCandidateStageId(fullPipeline, candidateId);
      const targetStageId = resolveTargetStageId(fullPipeline, String(over.id));

      if (!sourceStageId || !targetStageId || sourceStageId === targetStageId) {
        return;
      }

      const targetStage = fullPipeline.stages.find((stage) => stage.id === targetStageId);
      const candidate = findCandidateInPipeline(fullPipeline, candidateId);
      if (!candidate || !targetStage) return;

      const previousPipeline = fullPipeline;
      const optimisticPipeline = moveCandidateBetweenStages(
        fullPipeline,
        candidateId,
        targetStageId,
      );

      onPipelineChange(optimisticPipeline);

      if (isRejectedStageName(targetStage.name)) {
        setPendingRejection({
          candidateId,
          candidateName: candidate.name,
          targetStageId,
          previousPipeline,
        });
        return;
      }

      await completeStageMove(candidateId, targetStageId, previousPipeline);
    },
    [completeStageMove, onPipelineChange, fullPipeline],
  );

  const handleRejectCancel = () => {
    if (pendingRejection) {
      onPipelineChange(pendingRejection.previousPipeline);
    }
    setPendingRejection(null);
  };

  return (
    <>
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

          <div className="flex gap-4 overflow-x-auto pb-6 [-ms-overflow-style:none] [scrollbar-width:thin]">
            {pipeline.stages.map((stage, index) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                index={index}
                sortOrder={sortOrder}
                onSelectCandidate={onSelectCandidate}
                focusedCandidateId={focusedCandidateId}
                blindHiring={blindHiring}
                compareSelectedIds={compareSelectedIds}
                onToggleCompare={onToggleCompare}
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

      <RejectionReasonModal
        candidateName={pendingRejection?.candidateName ?? ""}
        isOpen={Boolean(pendingRejection)}
        onClose={handleRejectCancel}
        onConfirm={async (input) => {
          if (!pendingRejection) return;
          await completeStageMove(
            pendingRejection.candidateId,
            pendingRejection.targetStageId,
            pendingRejection.previousPipeline,
            input,
          );
          setPendingRejection(null);
        }}
      />

      <StageEmailConfirmModal
        isOpen={Boolean(pendingEmail)}
        kind={pendingEmail?.kind ?? "offered"}
        candidateId={pendingEmail?.candidateId ?? ""}
        candidateName={pendingEmail?.candidateName ?? ""}
        candidateEmail={pendingEmail?.candidateEmail}
        jobTitle={fullPipeline.title}
        recruiterName={recruiterName}
        onClose={() => setPendingEmail(null)}
      />
    </>
  );
}
