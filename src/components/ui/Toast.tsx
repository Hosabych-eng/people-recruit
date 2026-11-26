"use client";

import { useEffect } from "react";

type ToastProps = {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
  variant?: "success" | "error";
};

export function Toast({
  message,
  onDismiss,
  durationMs = 3200,
  variant = "success",
}: ToastProps) {
  useEffect(() => {
    if (!message) return;

    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss, durationMs]);

  if (!message) return null;

  const isError = variant === "error";

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        isError
          ? "fixed bottom-6 right-6 z-[60] flex max-w-sm items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900 shadow-lg"
          : "fixed bottom-6 right-6 z-[60] flex max-w-sm items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-lg"
      }
    >
      <span
        aria-hidden
        className={
          isError
            ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs text-white"
            : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs text-white"
        }
      >
        {isError ? "!" : "✓"}
      </span>
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className={
          isError
            ? "ml-auto rounded px-1 text-red-700/70 hover:text-red-900"
            : "ml-auto rounded px-1 text-emerald-700/70 hover:text-emerald-900"
        }
        aria-label="Закрити сповіщення"
      >
        ×
      </button>
    </div>
  );
}
