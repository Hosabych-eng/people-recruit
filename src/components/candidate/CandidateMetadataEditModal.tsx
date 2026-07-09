"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { CandidateFieldSchemaItem, CandidateProfile } from "@/types";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";
import { api } from "@/lib/api/client";

type CandidateMetadataEditModalProps = {
  profile: CandidateProfile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: CandidateProfile) => void;
};

const READ_ONLY_KEYS = new Set(["id", "source"]);

type FormValues = Record<string, string>;

function buildInitialValues(profile: CandidateProfile): FormValues {
  return {
    name: profile.name,
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    position: profile.position ?? "",
    englishLevel: profile.englishLevel ?? "",
    chineseLevel: profile.chineseLevel ?? "",
    expectedSalary: profile.expectedSalary != null ? String(profile.expectedSalary) : "",
    salaryCurrency: profile.salaryCurrency ?? "USD",
    coverLetter: profile.coverLetter ?? "",
    ...profile.customFields,
  };
}

export function CandidateMetadataEditModal({
  profile,
  isOpen,
  onClose,
  onSuccess,
}: CandidateMetadataEditModalProps) {
  const [schema, setSchema] = useState<CandidateFieldSchemaItem[]>([]);
  const [englishLevels, setEnglishLevels] = useState<string[]>([]);
  const [chineseLevels, setChineseLevels] = useState<string[]>([]);
  const [values, setValues] = useState<FormValues>(() => buildInitialValues(profile));
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setValues(buildInitialValues(profile));
    setError(null);
    setIsSubmitting(false);
    setIsLoading(true);

    void Promise.all([
      fetch("/api/candidate-fields").then((r) => r.json()),
      fetch("/api/careers/options").then((r) => r.json()),
    ])
      .then(([fields, options]) => {
        setSchema(fields);
        setEnglishLevels(
          (options.englishLevels ?? []).map((row: { label: string }) => row.label),
        );
        setChineseLevels(
          (options.chineseLevels ?? []).map((row: { label: string }) => row.label),
        );
      })
      .catch(() => setError("Не вдалося завантажити поля"))
      .finally(() => setIsLoading(false));
  }, [isOpen, profile]);

  const editableFields = useMemo(
    () => schema.filter((field) => !READ_ONLY_KEYS.has(field.fieldKey)),
    [schema],
  );

  if (!isOpen) return null;

  const updateValue = (key: string, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const standardPayload: Record<string, unknown> = {};
      const customPayload: Record<string, string> = {};

      for (const field of editableFields) {
        if (field.isCustom) {
          customPayload[field.fieldKey] = values[field.fieldKey] ?? "";
          continue;
        }

        switch (field.fieldKey) {
          case "name":
            standardPayload.name = values.name.trim();
            break;
          case "email":
            standardPayload.email = values.email.trim() || null;
            break;
          case "phone":
            standardPayload.phone = values.phone.trim() || null;
            break;
          case "position":
            standardPayload.position = values.position.trim() || null;
            break;
          case "englishLevel":
            standardPayload.englishLevel = values.englishLevel || null;
            break;
          case "chineseLevel":
            standardPayload.chineseLevel = values.chineseLevel || null;
            break;
          case "salary":
            standardPayload.expectedSalary = values.expectedSalary
              ? Number(values.expectedSalary)
              : null;
            standardPayload.salaryCurrency = values.salaryCurrency.trim() || "USD";
            break;
          case "coverLetter":
            standardPayload.coverLetter = values.coverLetter.trim() || null;
            break;
          default:
            break;
        }
      }

      if (Object.keys(standardPayload).length > 0) {
        await api.candidates.update(profile.id, standardPayload);
      }

      if (Object.keys(customPayload).length > 0) {
        const response = await fetch(`/api/candidates/${profile.id}/custom-fields`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ values: customPayload }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Не вдалося зберегти кастомні поля");
      }

      const refreshed = await api.candidates.profile(profile.id);
      onSuccess(refreshed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося зберегти зміни");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: CandidateFieldSchemaItem) => {
    if (field.isCustom) {
      if (field.fieldType === "DROPDOWN") {
        return (
          <select
            className={formControlClassName}
            value={values[field.fieldKey] ?? ""}
            onChange={(e) => updateValue(field.fieldKey, e.target.value)}
          >
            <option value="">—</option>
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      }

      return (
        <input
          type="text"
          className={formControlClassName}
          value={values[field.fieldKey] ?? ""}
          onChange={(e) => updateValue(field.fieldKey, e.target.value)}
        />
      );
    }

    switch (field.fieldKey) {
      case "name":
        return (
          <input
            type="text"
            required
            className={formControlClassName}
            value={values.name}
            onChange={(e) => updateValue("name", e.target.value)}
          />
        );
      case "email":
        return (
          <input
            type="email"
            className={formControlClassName}
            value={values.email}
            onChange={(e) => updateValue("email", e.target.value)}
          />
        );
      case "phone":
        return (
          <input
            type="tel"
            className={formControlClassName}
            value={values.phone}
            onChange={(e) => updateValue("phone", e.target.value)}
          />
        );
      case "position":
        return (
          <input
            type="text"
            className={formControlClassName}
            value={values.position}
            onChange={(e) => updateValue("position", e.target.value)}
          />
        );
      case "englishLevel":
        return (
          <select
            className={formControlClassName}
            value={values.englishLevel}
            onChange={(e) => updateValue("englishLevel", e.target.value)}
          >
            <option value="">—</option>
            {englishLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        );
      case "chineseLevel":
        return (
          <select
            className={formControlClassName}
            value={values.chineseLevel}
            onChange={(e) => updateValue("chineseLevel", e.target.value)}
          >
            <option value="">—</option>
            {chineseLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        );
      case "salary":
        return (
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              className={formControlClassName}
              placeholder="Сума"
              value={values.expectedSalary}
              onChange={(e) => updateValue("expectedSalary", e.target.value)}
            />
            <input
              type="text"
              className={`${formControlClassName} w-24`}
              placeholder="USD"
              value={values.salaryCurrency}
              onChange={(e) => updateValue("salaryCurrency", e.target.value)}
            />
          </div>
        );
      case "coverLetter":
        return (
          <textarea
            rows={4}
            className={formControlClassName}
            value={values.coverLetter}
            onChange={(e) => updateValue("coverLetter", e.target.value)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Закрити"
        className="absolute inset-0 bg-slate-900/20"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Редагування профілю
          </p>
          <h2 className="text-lg font-semibold text-foreground">{profile.name}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          {isLoading ? (
            <p className="text-sm text-muted">Завантаження полів…</p>
          ) : (
            editableFields.map((field) => (
              <div key={field.id} className="space-y-2">
                <label className={formLabelClassName}>{field.label}</label>
                {renderField(field)}
              </div>
            ))
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Скасувати
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Збереження…
                </span>
              ) : (
                "Зберегти"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
