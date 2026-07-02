"use client";

import type { JobWithPipeline } from "@/types";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { formControlClassName } from "@/components/ui/formStyles";
import {
  exportPipelineToCsv,
  exportPipelineToXlsx,
} from "@/lib/pipeline-export";
import type { CandidateSortOrder } from "@/lib/pipeline-utils";
import type {
  CandidateViewFilter,
  PipelineCardFilter,
} from "@/lib/pipeline-utils";

export type { CandidateViewFilter, PipelineCardFilter };

type PipelineFilterBarProps = {
  pipeline: JobWithPipeline;
  viewFilter: CandidateViewFilter;
  onViewFilterChange: (filter: CandidateViewFilter) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  sortOrder: CandidateSortOrder;
  onSortOrderChange: (order: CandidateSortOrder) => void;
  cardFilters: PipelineCardFilter[];
  onCardFiltersChange: (filters: PipelineCardFilter[]) => void;
};

const VIEW_TABS: { id: CandidateViewFilter; label: string }[] = [
  { id: "active", label: "Активні" },
  { id: "rejected", label: "Відхилені" },
];

const ADD_FILTER_OPTIONS: { id: PipelineCardFilter; label: string }[] = [
  { id: "hasCv", label: "Має CV" },
  { id: "hasNotes", label: "Має коментарі" },
  { id: "isNew", label: "Новий" },
];

export function PipelineFilterBar({
  pipeline,
  viewFilter,
  onViewFilterChange,
  searchQuery,
  onSearchQueryChange,
  sortOrder,
  onSortOrderChange,
  cardFilters,
  onCardFiltersChange,
}: PipelineFilterBarProps) {
  const toggleCardFilter = (filter: PipelineCardFilter) => {
    onCardFiltersChange(
      cardFilters.includes(filter)
        ? cardFilters.filter((item) => item !== filter)
        : [...cardFilters, filter],
    );
  };

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-border bg-card p-0.5 shadow-sm"
            role="tablist"
            aria-label="Фільтр статусу кандидатів"
          >
            {VIEW_TABS.map((tab) => {
              const isActive = viewFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onViewFilterChange(tab.id)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <DropdownMenu
            label={
              <>
                <FilterIcon />
                <span>Додати фільтр</span>
                {cardFilters.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                    {cardFilters.length}
                  </span>
                )}
              </>
            }
            items={ADD_FILTER_OPTIONS.map((option) => ({
              id: option.id,
              label: cardFilters.includes(option.id)
                ? `✓ ${option.label}`
                : option.label,
              onClick: () => toggleCardFilter(option.id),
            }))}
          />
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2 xl:justify-end">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Пошук кандидатів…"
              className={`${formControlClassName} w-full py-1.5 pl-9 text-sm`}
            />
          </div>

          <DropdownMenu
            align="right"
            label={
              <>
                <SettingsIcon />
                <span>Налаштування вигляду</span>
              </>
            }
            items={[
              {
                id: "newest",
                label: sortOrder === "newest" ? "✓ Спочатку нові" : "Спочатку нові",
                onClick: () => onSortOrderChange("newest"),
              },
              {
                id: "oldest",
                label: sortOrder === "oldest" ? "✓ Спочатку старі" : "Спочатку старі",
                onClick: () => onSortOrderChange("oldest"),
              },
            ]}
          />

          <DropdownMenu
            align="right"
            label={
              <>
                <ExportIcon />
                <span>Експорт у</span>
              </>
            }
            items={[
              {
                id: "csv",
                label: "CSV",
                onClick: () => exportPipelineToCsv(pipeline),
              },
              {
                id: "xlsx",
                label: "Excel (.xlsx)",
                onClick: () => exportPipelineToXlsx(pipeline),
              },
            ]}
          />
        </div>
      </div>

      {cardFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {cardFilters.map((filter) => {
            const option = ADD_FILTER_OPTIONS.find((item) => item.id === filter);
            if (!option) return null;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => toggleCardFilter(filter)}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
              >
                {option.label}
                <span aria-hidden>×</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onCardFiltersChange([])}
            className="text-xs text-muted transition-colors hover:text-foreground"
          >
            Очистити фільтри
          </button>
        </div>
      )}
    </div>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z" />
    </svg>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}
