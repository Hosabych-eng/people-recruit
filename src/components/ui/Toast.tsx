"use client";

import { useEffect } from "react";

type ToastProps = {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
};

export function Toast({ message, onDismiss, durationMs = 3200 }: ToastProps) {
  useEffect(() => {
    if (!message) return;

    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss, durationMs]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[60] flex max-w-sm items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-lg"
    >
      <span
        aria-hidden
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs text-white"
      >
        ✓
      </span>
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-auto rounded px-1 text-emerald-700/70 hover:text-emerald-900"
        aria-label="Закрити сповіщення"
      >
        ×
      </button>
    </div>
  );
}
