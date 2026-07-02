"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { TestAssignmentTemplate } from "@/types";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";
import { api } from "@/lib/api/client";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TestAssignmentsView() {
  const [templates, setTemplates] = useState<TestAssignmentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.testAssignmentTemplates.list();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося завантажити шаблони");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await api.testAssignmentTemplates.upload({
        title: title.trim(),
        description: description.trim() || undefined,
        file,
      });
      setTemplates((current) => [created, ...current]);
      setTitle("");
      setDescription("");
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося завантажити шаблон");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Видалити цей шаблон?")) return;

    try {
      await api.testAssignmentTemplates.delete(id);
      setTemplates((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося видалити шаблон");
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-card px-4 py-5 shadow-sm sm:px-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          Recruiting
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Тестові завдання
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Завантажуйте шаблони тестових завдань (PDF, DOC, DOCX) і надсилайте їх кандидатам із профілю.
        </p>
      </header>

      <div className="mx-auto grid w-full max-w-[1400px] flex-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="min-w-0">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-foreground">Шаблони</h2>
            <p className="text-sm text-muted">{templates.length} файл(ів)</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-border bg-card">
              <Spinner className="h-8 w-8" />
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <p className="text-sm text-muted">Ще немає шаблонів тестових завдань.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {templates.map((template) => (
                <li
                  key={template.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{template.title}</p>
                    {template.description && (
                      <p className="mt-1 text-sm text-muted">{template.description}</p>
                    )}
                    <p className="mt-2 text-xs text-muted">
                      {template.fileName} · {formatFileSize(template.fileSize)} ·{" "}
                      {template.uploadedByName}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <a
                      href={api.testAssignmentTemplates.downloadUrl(template.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-slate-50"
                    >
                      Завантажити
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleDelete(template.id)}
                    >
                      Видалити
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Новий шаблон</h2>
          <p className="mt-1 text-sm text-muted">PDF або DOC/DOCX</p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="template-title" className={formLabelClassName}>
                Назва <span className="text-red-500">*</span>
              </label>
              <input
                id="template-title"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={formControlClassName}
                placeholder="Frontend — тестове завдання"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="template-description" className={formLabelClassName}>
                Опис
              </label>
              <textarea
                id="template-description"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={formControlClassName}
                placeholder="Короткий опис завдання для рекрутерів"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="template-file" className={formLabelClassName}>
                Файл <span className="text-red-500">*</span>
              </label>
              <input
                id="template-file"
                type="file"
                required
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className={formControlClassName}
              />
            </div>

            <Button type="submit" disabled={isSubmitting || !file} className="w-full">
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Завантаження…
                </span>
              ) : (
                "Зберегти шаблон"
              )}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
