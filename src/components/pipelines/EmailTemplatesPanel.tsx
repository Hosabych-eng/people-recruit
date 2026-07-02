"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { EmailTemplate } from "@/types";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";
import { EMAIL_TEMPLATE_PLACEHOLDERS } from "@/lib/email-template-compile";
import { api } from "@/lib/api/client";

function emptyForm() {
  return { title: "", subject: "", body: "" };
}

export function EmailTemplatesPanel() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const isEditing = editingId !== null;

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.emailTemplates.list();
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

  const resetForm = () => {
    setEditingId(null);
    const cleared = emptyForm();
    setTitle(cleared.title);
    setSubject(cleared.subject);
    setBody(cleared.body);
  };

  const handleStartEdit = (template: EmailTemplate) => {
    setEditingId(template.id);
    setTitle(template.title);
    setSubject(template.subject);
    setBody(template.body);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = {
      title: title.trim(),
      subject: subject.trim(),
      body: body.trim(),
    };

    try {
      if (isEditing && editingId) {
        const updated = await api.emailTemplates.update(editingId, payload);
        setTemplates((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        resetForm();
      } else {
        const created = await api.emailTemplates.create(payload);
        setTemplates((current) => [created, ...current]);
        resetForm();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditing
            ? "Не вдалося оновити шаблон"
            : "Не вдалося створити шаблон",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Видалити цей шаблон листа?")) return;

    try {
      await api.emailTemplates.delete(id);
      setTemplates((current) => current.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося видалити шаблон");
    }
  };

  return (
    <section className="mt-10 rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold text-foreground">Шаблони листів</h2>
        <p className="mt-1 text-sm text-muted">
          Використовуйте плейсхолдери: {EMAIL_TEMPLATE_PLACEHOLDERS.join(", ")}
        </p>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              {isEditing ? "Редагування шаблону" : "Новий шаблон"}
            </h3>
            {isEditing && (
              <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                Скасувати
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="template-title" className={formLabelClassName}>
              Назва шаблону
            </label>
            <input
              id="template-title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={formControlClassName}
              placeholder="Запрошення на інтерв'ю"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="template-subject" className={formLabelClassName}>
              Тема листа
            </label>
            <input
              id="template-subject"
              required
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className={formControlClassName}
              placeholder="Інтерв'ю: {{job_title}}"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="template-body" className={formLabelClassName}>
              Текст листа
            </label>
            <textarea
              id="template-body"
              required
              rows={8}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className={formControlClassName}
              placeholder={"Вітаємо, {{candidate_name}}!\n\nЗапрошуємо вас на інтерв'ю..."}
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                Збереження…
              </span>
            ) : isEditing ? (
              "Зберегти зміни"
            ) : (
              "Зберегти шаблон"
            )}
          </Button>
        </form>

        <div className="min-w-0">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner className="h-6 w-6" />
            </div>
          ) : templates.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">Ще немає шаблонів.</p>
          ) : (
            <ul className="space-y-3">
              {templates.map((template) => {
                const isActive = editingId === template.id;

                return (
                  <li
                    key={template.id}
                    className={`rounded-lg border px-4 py-3 ${
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{template.title}</p>
                        <p className="mt-1 text-sm text-muted">{template.subject}</p>
                        <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-xs text-foreground/80">
                          {template.body}
                        </pre>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2">
                        <Button
                          variant={isActive ? "primary" : "outline"}
                          size="sm"
                          onClick={() => handleStartEdit(template)}
                        >
                          Редагувати
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleDelete(template.id)}
                        >
                          Видалити
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
