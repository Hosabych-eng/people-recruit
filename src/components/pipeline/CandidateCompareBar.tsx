"use client";

import type { PipelineCandidate } from "@/types";
import { Button } from "@/components/ui/Button";

type CandidateCompareBarProps = {
  selected: PipelineCandidate[];
  onClear: () => void;
  onCompare: () => void;
};

export function CandidateCompareBar({
  selected,
  onClear,
  onCompare,
}: CandidateCompareBarProps) {
  if (selected.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-card px-4 py-2 shadow-lg">
      <span className="text-sm text-muted">
        {selected.length} selected (max 3)
      </span>
      <Button
        type="button"
        size="sm"
        disabled={selected.length < 2}
        onClick={onCompare}
      >
        Compare now
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}
