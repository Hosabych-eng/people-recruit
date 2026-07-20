"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type SearchableSelectItem = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  items: SearchableSelectItem[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function SearchableSelect({
  items,
  value,
  onChange,
  placeholder = "Оберіть…",
  disabled = false,
}: SearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => items.find((item) => item.value === value) ?? null,
    [items, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      item.label.toLowerCase().includes(q),
    );
  }, [items, query]);

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
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selected ? "text-foreground" : "text-muted"}>
          {selected ? selected.label : placeholder}
        </span>
        <span aria-hidden className="text-muted">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select"
          className="absolute left-0 right-0 z-[70] mt-1 max-h-64 overflow-auto rounded-lg border border-border bg-card shadow-lg"
        >
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
              const isSelected = item.value === value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                    isSelected
                      ? "bg-slate-100 text-foreground"
                      : "hover:bg-slate-50 text-muted"
                  }`}
                >
                  {item.label}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

