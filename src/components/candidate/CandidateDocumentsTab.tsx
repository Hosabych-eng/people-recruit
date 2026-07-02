"use client";

import { useState, type FormEvent } from "react";
import type { CandidateDocument } from "@/types";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";
import { api } from "@/lib/api/client";
import { formatRelativeTimeUk } from "@/lib/format-relative-time";

type CandidateDocumentsTabProps = {
  candidateId: string;
  documents: CandidateDocument[];
  onDocumentsChange: (documents: CandidateDocument[]) => void;
};

const CATEGORY_LABELS: Record<CandidateDocument["category"], string> = {
  RESUME: "Резюме",
  PORTFOLIO: "Портфоліо",
  OTHER: "Інше",
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CandidateDocumentsTab({
  candidateId,
  documents,
  onDocumentsChange,
}: CandidateDocumentsTabProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CandidateDocument["category"]>("RESUME");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await api.candidates.documents.upload(candidateId, {
        title: title.trim(),
        category,
        file,
      });
      onDocumentsChange([created, ...documents]);
      setTitle("");
      setCategory("RESUME");
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося завантажити документ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!window.confirm("Видалити цей документ?")) return;

    try {
      await api.candidates.documents.delete(candidateId, documentId);
      onDocumentsChange(documents.filter((doc) => doc.id !== documentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося видалити документ");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Документи кандидата</h2>
          <p className="text-sm text-muted">Резюме, портфоліо та інші особисті файли</p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 px-5 py-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="document-title" className={formLabelClassName}>
              Назва <span className="text-red-500">*</span>
            </label>
            <input
              id="document-title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={formControlClassName}
              placeholder="Резюме — Senior Developer"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="document-category" className={formLabelClassName}>
              Категорія
            </label>
            <select
              id="document-category"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as CandidateDocument["category"])
              }
              className={formControlClassName}
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="document-file" className={formLabelClassName}>
              Файл <span className="text-red-500">*</span>
            </label>
            <input
              id="document-file"
              type="file"
              required
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className={formControlClassName}
            />
          </div>

          <div className="md:col-span-2">
            {error && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <Button type="submit" disabled={isSubmitting || !file}>
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Завантаження…
                </span>
              ) : (
                "Завантажити документ"
              )}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold text-foreground">Збережені файли</h3>
        </div>

        {documents.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            Ще немає завантажених документів.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {documents.map((document) => (
              <li
                key={document.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{document.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    {CATEGORY_LABELS[document.category]} · {document.fileName} ·{" "}
                    {formatFileSize(document.fileSize)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {document.uploadedByName} · {formatRelativeTimeUk(document.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a
                    href={api.candidates.documents.downloadUrl(candidateId, document.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-slate-50"
                  >
                    Переглянути
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleDelete(document.id)}
                  >
                    Видалити
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
