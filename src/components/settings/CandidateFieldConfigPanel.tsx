"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";
import type { CandidateFieldSchemaItem } from "@/types";

export function CandidateFieldConfigPanel() {
  const [fields, setFields] = useState<CandidateFieldSchemaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState("");
  const [customType, setCustomType] = useState<"TEXT" | "DROPDOWN">("TEXT");
  const [customOptions, setCustomOptions] = useState("");

  const load = async () => {
    const response = await fetch("/api/settings/candidate-fields");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Failed to load fields");
    setFields(payload);
  };

  useEffect(() => {
    void load().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load fields"),
    );
  }, []);

  const patch = async (id: string, data: Record<string, unknown>) => {
    const response = await fetch("/api/settings/candidate-fields", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Update failed");
    await load();
  };

  const createCustom = async () => {
    const options =
      customType === "DROPDOWN"
        ? customOptions
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [];

    const response = await fetch("/api/settings/candidate-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: customLabel,
        fieldType: customType,
        options,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Create failed");
    setCustomLabel("");
    setCustomOptions("");
    await load();
  };

  const remove = async (id: string) => {
    const response = await fetch(`/api/settings/candidate-fields?id=${id}`, {
      method: "DELETE",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Delete failed");
    await load();
  };

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (fields.length === 0) return <p className="text-sm text-muted">Завантаження полів…</p>;

  const standardFields = fields.filter((field) => !field.isCustom);
  const customFields = fields.filter((field) => field.isCustom);

  return (
    <div className="space-y-3">
      <div>
        <p className={formLabelClassName}>Стандартні поля</p>
        <ul className="space-y-1">
          {standardFields.map((field) => (
            <li
              key={field.id}
              className="flex items-center justify-between rounded border border-border px-2 py-1 text-xs"
            >
              <span>{field.label}</span>
              <label className="inline-flex items-center gap-1 text-muted">
                <input
                  type="checkbox"
                  checked={field.visible}
                  disabled={field.fieldKey === "id"}
                  onChange={(e) =>
                    void patch(field.id, { visible: e.target.checked }).catch((err) =>
                      setError(err instanceof Error ? err.message : "Update failed"),
                    )
                  }
                />
                Показувати
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className={formLabelClassName}>Кастомні поля</p>
        <ul className="space-y-1">
          {customFields.map((field) => (
            <li
              key={field.id}
              className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1 text-xs"
            >
              <span>
                {field.label}{" "}
                <span className="text-muted">
                  ({field.fieldType === "DROPDOWN" ? "список" : "текст"})
                </span>
              </span>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1 text-muted">
                  <input
                    type="checkbox"
                    checked={field.visible}
                    onChange={(e) =>
                      void patch(field.id, { visible: e.target.checked }).catch((err) =>
                        setError(err instanceof Error ? err.message : "Update failed"),
                      )
                    }
                  />
                  Показувати
                </label>
                <button
                  type="button"
                  className="text-red-600"
                  onClick={() =>
                    void remove(field.id).catch((err) =>
                      setError(err instanceof Error ? err.message : "Delete failed"),
                    )
                  }
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2 rounded border border-dashed border-border p-2">
        <p className="text-xs font-medium">Додати кастомне поле</p>
        <input
          className={formControlClassName}
          placeholder="Назва поля"
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
        />
        <select
          className={formControlClassName}
          value={customType}
          onChange={(e) => setCustomType(e.target.value as "TEXT" | "DROPDOWN")}
        >
          <option value="TEXT">Текст</option>
          <option value="DROPDOWN">Список</option>
        </select>
        {customType === "DROPDOWN" && (
          <input
            className={formControlClassName}
            placeholder="Опції через кому (A, B, C)"
            value={customOptions}
            onChange={(e) => setCustomOptions(e.target.value)}
          />
        )}
        <Button
          type="button"
          size="sm"
          disabled={!customLabel.trim()}
          onClick={() =>
            void createCustom().catch((err) =>
              setError(err instanceof Error ? err.message : "Create failed"),
            )
          }
        >
          Додати поле
        </Button>
      </div>
    </div>
  );
}
