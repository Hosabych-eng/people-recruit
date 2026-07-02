"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type DropdownMenuItem = {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

type DropdownMenuProps = {
  label: ReactNode;
  items: DropdownMenuItem[];
  align?: "left" | "right";
  className?: string;
  menuClassName?: string;
};

export function DropdownMenu({
  label,
  items,
  align = "left",
  className = "",
  menuClassName = "",
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground shadow-sm transition-colors hover:bg-slate-50"
      >
        {label}
        <ChevronDownIcon />
      </button>

      {open && (
        <div
          className={`absolute top-full z-30 mt-1 min-w-[11rem] rounded-lg border border-border bg-card py-1 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          } ${menuClassName}`}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                setOpen(false);
                item.onClick();
              }}
              className={`block w-full px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                item.destructive
                  ? "text-red-700 hover:bg-red-50"
                  : "text-foreground hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4 text-muted"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
