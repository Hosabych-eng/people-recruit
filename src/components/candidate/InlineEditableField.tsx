"use client";

import { useEffect, useRef, useState } from "react";
import { formControlClassName } from "@/components/ui/formStyles";

type InlineEditableFieldProps = {
  label: string;
  value: string;
  type?: "text" | "url" | "date" | "email" | "tel";
  placeholder?: string;
  disabled?: boolean;
  onSave: (nextValue: string) => Promise<void>;
};

export function InlineEditableField({
  label,
  value,
  type = "text",
  placeholder = "—",
  disabled = false,
  onSave,
}: InlineEditableFieldProps) {
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSaved = useRef(value);

  useEffect(() => {
    setDraft(value);
    lastSaved.current = value;
  }, [value]);

  const commit = async () => {
    const next = draft.trim();
    const previous = lastSaved.current.trim();
    if (next === previous || isSaving || disabled) return;

    setIsSaving(true);
    setError(null);
    try {
      await onSave(next);
      lastSaved.current = next;
    } catch (err) {
      setDraft(lastSaved.current);
      setError(err instanceof Error ? err.message : "Не збережено");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex gap-2 border-b border-border/40 py-1.5 text-xs last:border-0">
      <span className="w-28 shrink-0 font-medium text-muted">{label}</span>
      <div className="min-w-0 flex-1">
        <input
          type={type}
          value={draft}
          disabled={disabled || isSaving}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              setDraft(lastSaved.current);
              event.currentTarget.blur();
            }
          }}
          className={`${formControlClassName} py-1 text-xs ${
            isSaving ? "opacity-70" : ""
          }`}
        />
        {error && <p className="mt-0.5 text-[10px] text-red-600">{error}</p>}
      </div>
    </div>
  );
}
