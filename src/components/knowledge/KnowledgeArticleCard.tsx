"use client";

import { useState, type FormEvent } from "react";
import type { KnowledgeArticle } from "@/types";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";
import { api } from "@/lib/api/client";

type KnowledgeArticleCardProps = {
  article: KnowledgeArticle;
  onUpdated: () => void;
  onDeleted: (id: string) => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function previewContent(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > 180
    ? `${normalized.slice(0, 180)}…`
    : normalized;
}

export function KnowledgeArticleCard({
  article,
  onUpdated,
  onDeleted,
}: KnowledgeArticleCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(article.title);
  const [content, setContent] = useState(article.content);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStartEdit = () => {
    setTitle(article.title);
    setContent(article.content);
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await api.knowledge.update(article.id, {
        title: title.trim(),
        content: content.trim(),
      });
      setIsEditing(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося оновити статтю");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Видалити статтю «${article.title}»?`)) return;
    setIsDeleting(true);
    setError(null);
    try {
      await api.knowledge.delete(article.id);
      onDeleted(article.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося видалити статтю");
      setIsDeleting(false);
    }
  };

  if (isEditing) {
    return (
      <article className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block space-y-2">
            <span className={formLabelClassName}>Заголовок</span>
            <input
              type="text"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={formControlClassName}
            />
          </label>
          <label className="block space-y-2">
            <span className={formLabelClassName}>Зміст</span>
            <textarea
              required
              rows={8}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className={`${formControlClassName} min-h-[160px] resize-y`}
            />
          </label>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Збереження…
                </>
              ) : (
                "Зберегти"
              )}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleCancel}>
              Скасувати
            </Button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground sm:text-lg">
          {article.title}
        </h2>
        <time
          dateTime={article.createdAt}
          className="shrink-0 text-xs font-medium text-muted"
        >
          {formatDate(article.createdAt)}
        </time>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted">
        {previewContent(article.content)}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Додав(ла){" "}
          <span className="font-medium text-foreground">{article.authorName}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={handleStartEdit}>
            Редагувати
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isDeleting}
            onClick={() => void handleDelete()}
            className="text-red-700 hover:border-red-200 hover:bg-red-50"
          >
            {isDeleting ? <Spinner className="h-4 w-4" /> : "Видалити"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </article>
  );
}
