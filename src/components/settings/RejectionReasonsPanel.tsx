"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";

export function RejectionReasonsPanel() {
  const [reasons, setReasons] = useState<{ id: string; name: string }[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch("/api/settings/rejection-reasons");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Failed to load");
    setReasons(payload);
  };

  useEffect(() => {
    void load().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load"),
    );
  }, []);

  const add = async () => {
    const response = await fetch("/api/settings/rejection-reasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Create failed");
    setName("");
    await load();
  };

  const remove = async (id: string) => {
    const response = await fetch(`/api/settings/rejection-reasons?id=${id}`, {
      method: "DELETE",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Delete failed");
    await load();
  };

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {reasons.map((reason) => (
          <li
            key={reason.id}
            className="flex items-center justify-between rounded border border-border px-2 py-1 text-xs"
          >
            {reason.name}
            <button
              type="button"
              className="text-red-600"
              onClick={() =>
                void remove(reason.id).catch((err) =>
                  setError(err instanceof Error ? err.message : "Delete failed"),
                )
              }
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          className={formControlClassName}
          placeholder="Нова причина (Salary, English…)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          type="button"
          size="sm"
          disabled={!name.trim()}
          onClick={() =>
            void add().catch((err) =>
              setError(err instanceof Error ? err.message : "Create failed"),
            )
          }
        >
          Додати
        </Button>
      </div>
      <p className={formLabelClassName}>
        Використовується при переміщенні кандидата на етап Rejected.
      </p>
    </div>
  );
}
