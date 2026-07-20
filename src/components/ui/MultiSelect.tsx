"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type MultiSelectItem = {
  value: string;
  label: string;
};

type MultiSelectProps = {
  items: MultiSelectItem[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
};

function summarizeSelected(items: MultiSelectItem[], selected: string[]) {
  const labels = selected
    .map((id) => items.find((i) => i.value === id)?.label)
    .filter(Boolean) as string[];
  if (labels.length === 0) return "";
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
}

export function MultiSelect({
  items,
  value,
  onChange,
  placeholder = "Оберіть…",
  disabled = false,
}: MultiSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(value), [value]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, query]);

  const summary = summarizeSelected(items, value);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={value.length ? "text-foreground" : "text-muted"}>
          {value.length ? summary : placeholder}
        </span>
        <span aria-hidden className="text-muted">
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-[70] mt-1 max-h-64 overflow-auto rounded-lg border border-border bg-card shadow-lg">
          <div className="sticky top-0 border-b border-border bg-card p-2">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Пошук…"
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted">Нічого не знайдено</div>
          ) : (
            filtered.map((item) => {
              const checked = selectedSet.has(item.value);
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    const next = checked
                      ? value.filter((id) => id !== item.value)
                      : [...value, item.value];
                    onChange(next);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
                >
                  <span className={checked ? "font-semibold text-foreground" : "text-muted"}>
                    {item.label}
                  </span>
                  <span
                    aria-hidden
                    className={`h-4 w-4 rounded border ${
                      checked ? "border-emerald-600 bg-emerald-600" : "border-border bg-background"
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

