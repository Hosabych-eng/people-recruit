"use client";

import { useEffect } from "react";
import type { JobWithPipeline, PipelineCandidate } from "@/types";
import {
  findCandidateInPipeline,
  getCandidateStageId,
} from "@/lib/pipeline-utils";

type UsePipelineKeyboardShortcutsInput = {
  pipeline: JobWithPipeline | null;
  focusedCandidateId: string | null;
  onFocusCandidate: (candidateId: string | null) => void;
  onToggleDrawer: () => void;
  onOpenCreateModal: () => void;
  onMoveCandidate: (candidateId: string, targetStageId: string) => void;
  enabled?: boolean;
};

function getFlatCandidates(pipeline: JobWithPipeline) {
  return pipeline.stages.flatMap((stage) =>
    stage.candidates.map((candidate) => ({
      candidate,
      stageId: stage.id,
      stageIndex: pipeline.stages.findIndex((s) => s.id === stage.id),
    })),
  );
}

export function usePipelineKeyboardShortcuts({
  pipeline,
  focusedCandidateId,
  onFocusCandidate,
  onToggleDrawer,
  onOpenCreateModal,
  onMoveCandidate,
  enabled = true,
}: UsePipelineKeyboardShortcutsInput) {
  useEffect(() => {
    if (!enabled || !pipeline) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const flat = getFlatCandidates(pipeline);
      if (flat.length === 0) return;

      const currentIndex = focusedCandidateId
        ? flat.findIndex((row) => row.candidate.id === focusedCandidateId)
        : -1;

      if (event.code === "Space" && focusedCandidateId) {
        event.preventDefault();
        onToggleDrawer();
        return;
      }

      if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        onOpenCreateModal();
        return;
      }

      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        return;
      }

      event.preventDefault();

      if (currentIndex === -1) {
        onFocusCandidate(flat[0]?.candidate.id ?? null);
        return;
      }

      const current = flat[currentIndex];
      if (!current) return;

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const nextIndex =
          event.key === "ArrowUp"
            ? Math.max(0, currentIndex - 1)
            : Math.min(flat.length - 1, currentIndex + 1);
        onFocusCandidate(flat[nextIndex]?.candidate.id ?? null);
        return;
      }

      const stageDelta = event.key === "ArrowLeft" ? -1 : 1;
      const targetStageIndex = current.stageIndex + stageDelta;
      const targetStage = pipeline.stages[targetStageIndex];
      if (!targetStage) return;

      onMoveCandidate(current.candidate.id, targetStage.id);
      onFocusCandidate(current.candidate.id);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    enabled,
    focusedCandidateId,
    onFocusCandidate,
    onMoveCandidate,
    onOpenCreateModal,
    onToggleDrawer,
    pipeline,
  ]);
}

export function getFocusedCandidate(
  pipeline: JobWithPipeline | null,
  candidateId: string | null,
): PipelineCandidate | null {
  if (!pipeline || !candidateId) return null;
  return findCandidateInPipeline(pipeline, candidateId);
}

export function getCandidateStage(
  pipeline: JobWithPipeline | null,
  candidateId: string | null,
) {
  if (!pipeline || !candidateId) return null;
  return getCandidateStageId(pipeline, candidateId);
}
