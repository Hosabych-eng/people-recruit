"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { JobDetail, StageWithCount } from "@/types";
import { StageRow, StageRowOverlay } from "@/components/pipelines/StageRow";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName } from "@/components/ui/formStyles";
import { api } from "@/lib/api/client";
import { formatStageCountUk } from "@/lib/pipeline-stage-tags";

type PipelineConfiguratorViewProps = {
  jobId: string;
};

export function PipelineConfiguratorView({ jobId }: PipelineConfiguratorViewProps) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [stages, setStages] = useState<StageWithCount[]>([]);
  const [activeStage, setActiveStage] = useState<StageWithCount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const loadJob = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.jobs.get(jobId);
      setJob(data);
      setStages(data.stages);
    } catch (err) {
      setJob(null);
      setStages([]);
      setError(err instanceof Error ? err.message : "Не вдалося завантажити воронку");
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  const handleDragStart = (event: DragStartEvent) => {
    const stage = stages.find((item) => item.id === event.active.id);
    setActiveStage(stage ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveStage(null);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stages.findIndex((stage) => stage.id === active.id);
    const newIndex = stages.findIndex((stage) => stage.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previousStages = stages;
    const nextStages = arrayMove(stages, oldIndex, newIndex);
    setStages(nextStages);
    setIsSaving(true);
    setError(null);

    try {
      const updated = await api.jobs.reorderStages(
        jobId,
        nextStages.map((stage) => stage.id),
      );
      setStages(updated);
      setJob((current) => (current ? { ...current, stages: updated } : current));
    } catch (err) {
      setStages(previousStages);
      setError(err instanceof Error ? err.message : "Не вдалося зберегти порядок етапів");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAutomation = async (stage: StageWithCount) => {
    setIsSaving(true);
    setError(null);

    try {
      const updated = await api.stages.update(stage.id, {
        automationEnabled: !stage.automationEnabled,
      });
      setStages((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не вдалося оновити автоматизацію",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRename = async (stage: StageWithCount) => {
    const nextName = window.prompt("Нова назва етапу", stage.name)?.trim();
    if (!nextName || nextName === stage.name) return;

    setIsSaving(true);
    setError(null);

    try {
      const updated = await api.stages.update(stage.id, { name: nextName });
      setStages((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося перейменувати етап");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (stage: StageWithCount) => {
    const confirmed = window.confirm(
      `Видалити етап «${stage.name}»? Цю дію не можна скасувати.`,
    );
    if (!confirmed) return;

    setIsSaving(true);
    setError(null);

    try {
      await api.stages.delete(stage.id);
      await loadJob();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося видалити етап");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddStage = async () => {
    const name = newStageName.trim();
    if (!name) return;

    setIsSaving(true);
    setError(null);

    try {
      const created = await api.stages.create({ jobId, name });
      setStages((current) => [...current, created]);
      setNewStageName("");
      setJob((current) =>
        current
          ? {
              ...current,
              stages: [...current.stages, created],
              _count: {
                ...current._count,
                candidates: current._count.candidates,
              },
            }
          : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося додати етап");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-sm text-muted">Воронку не знайдено.</p>
        <Link href="/pipelines" className="mt-4 inline-block text-sm text-primary hover:underline">
          Повернутися до списку
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <Link
          href="/pipelines"
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          ← Усі воронки
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{job.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {formatStageCountUk(stages.length)} · перетягніть рядки, щоб змінити порядок
            </p>
          </div>
          {isSaving && (
            <span className="rounded-full bg-background px-3 py-1 text-xs text-muted ring-1 ring-border">
              Збереження…
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={stages.map((stage) => stage.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {stages.map((stage) => (
              <StageRow
                key={stage.id}
                stage={stage}
                isUpdating={isSaving}
                onToggleAutomation={handleToggleAutomation}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeStage ? <StageRowOverlay stage={activeStage} /> : null}
        </DragOverlay>
      </DndContext>

      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row">
        <input
          type="text"
          value={newStageName}
          onChange={(event) => setNewStageName(event.target.value)}
          placeholder="Назва нового етапу"
          className={formControlClassName}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleAddStage();
            }
          }}
        />
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={isSaving || !newStageName.trim()}
          onClick={handleAddStage}
        >
          Додати етап
        </Button>
      </div>
    </div>
  );
}
