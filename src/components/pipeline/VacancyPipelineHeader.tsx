"use client";

import type { JobWithPipeline } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { countFilledPositions } from "@/lib/pipeline-utils";

export const PIPELINE_SUB_TABS = [
  { id: "cycle", label: "Цикл", enabled: true },
  { id: "offers", label: "Пропозиції", enabled: false },
  { id: "discussions", label: "Обговорення", enabled: false },
  { id: "documents", label: "Документи", enabled: false },
  { id: "campaigns", label: "Кампанії", enabled: false },
  { id: "reports", label: "Звіти", enabled: true },
  { id: "details", label: "Деталі вакансії", enabled: false },
  { id: "activity", label: "Активність", enabled: false },
] as const;

export type PipelineSubTabId = (typeof PIPELINE_SUB_TABS)[number]["id"];

type VacancyPipelineHeaderProps = {
  pipeline: JobWithPipeline;
  activeTab?: PipelineSubTabId;
  onTabChange?: (tab: PipelineSubTabId) => void;
  onAddCandidate?: () => void;
  onImportCandidate?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
  canAddCandidate?: boolean;
};

export function VacancyPipelineHeader({
  pipeline,
  activeTab = "cycle",
  onTabChange,
  onAddCandidate,
  onImportCandidate,
  onShare,
  onEdit,
  canAddCandidate = false,
}: VacancyPipelineHeaderProps) {
  const filled = countFilledPositions(pipeline);
  const headcount = pipeline.headcount ?? 1;
  const filledLabel =
    headcount === 1
      ? `${filled} з ${headcount} заповнений`
      : `${filled} з ${headcount} заповнено`;

  return (
    <header className="border-b border-border bg-card">
      <div className="px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {pipeline.title}
              </h1>
              <Badge status={pipeline.status} />
            </div>
            <p className="text-sm text-muted">{filledLabel}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onShare}
              className="gap-1.5"
            >
              <ShareIcon />
              Поділитися
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="gap-1.5"
            >
              <EditIcon />
              Редагувати
            </Button>
            {canAddCandidate && (
              <>
                <Button size="sm" variant="outline" onClick={onImportCandidate} className="gap-1">
                  Імпорт
                </Button>
                <Button size="sm" onClick={onAddCandidate} className="gap-1">
                  <PlusIcon />
                  Кандидат
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <nav
        className="overflow-x-auto border-t border-border px-4 sm:px-6"
        aria-label="Розділи вакансії"
      >
        <ul className="flex min-w-max gap-1 py-1">
          {PIPELINE_SUB_TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <li key={tab.id}>
                <button
                  type="button"
                  disabled={!tab.enabled}
                  onClick={() => tab.enabled && onTabChange?.(tab.id)}
                  className={`relative whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "text-primary after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary"
                      : tab.enabled
                        ? "text-muted hover:text-foreground"
                        : "cursor-not-allowed text-muted/50"
                  }`}
                >
                  {tab.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
