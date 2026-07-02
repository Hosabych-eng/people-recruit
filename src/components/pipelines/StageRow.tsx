"use client";

import { useEffect, useRef, useState } from "react";
import type { StageWithCount } from "@/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getStageSystemTag } from "@/lib/pipeline-stage-tags";

type StageRowProps = {
  stage: StageWithCount;
  onToggleAutomation: (stage: StageWithCount) => void;
  onRename: (stage: StageWithCount) => void;
  onDelete: (stage: StageWithCount) => void;
  isUpdating?: boolean;
};

function DragHandleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <circle cx="9" cy="7" r="1.4" />
      <circle cx="15" cy="7" r="1.4" />
      <circle cx="9" cy="12" r="1.4" />
      <circle cx="15" cy="12" r="1.4" />
      <circle cx="9" cy="17" r="1.4" />
      <circle cx="15" cy="17" r="1.4" />
    </svg>
  );
}

function LightningIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 ${active ? "text-amber-500" : "text-muted"}`}
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
    </svg>
  );
}

export function StageRow({
  stage,
  onToggleAutomation,
  onRename,
  onDelete,
  isUpdating = false,
}: StageRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const systemTag = getStageSystemTag(stage.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 shadow-sm ${
        isDragging ? "z-10 opacity-80 ring-2 ring-primary/20" : ""
      }`}
    >
      <button
        type="button"
        aria-label="Перетягнути етап"
        className="cursor-grab text-muted hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <DragHandleIcon />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">{stage.name}</p>
          {systemTag && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {systemTag}
            </span>
          )}
          {stage._count.candidates > 0 && (
            <span className="text-xs text-muted">
              {stage._count.candidates} кандидат(ів)
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label={
            stage.automationEnabled
              ? "Автоматизацію увімкнено"
              : "Налаштувати автоматизацію"
          }
          title={
            stage.automationEnabled
              ? "Автоматизацію увімкнено"
              : "Увімкнути автоматизацію"
          }
          disabled={isUpdating}
          onClick={() => onToggleAutomation(stage)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background transition-colors hover:bg-slate-50"
        >
          <LightningIcon active={stage.automationEnabled} />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="Дії з етапом"
            aria-expanded={menuOpen}
            disabled={isUpdating}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted transition-colors hover:bg-slate-50 hover:text-foreground"
          >
            <span className="text-lg leading-none">···</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-border bg-card py-1 shadow-lg">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-slate-50"
                onClick={() => {
                  setMenuOpen(false);
                  onRename(stage);
                }}
              >
                Перейменувати
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(stage);
                }}
              >
                Видалити етап
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function StageRowOverlay({ stage }: { stage: StageWithCount }) {
  const systemTag = getStageSystemTag(stage.name);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-card px-3 py-3 shadow-lg ring-2 ring-primary/20">
      <span className="text-muted">
        <DragHandleIcon />
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-foreground">{stage.name}</p>
        {systemTag && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {systemTag}
          </span>
        )}
      </div>
    </div>
  );
}
