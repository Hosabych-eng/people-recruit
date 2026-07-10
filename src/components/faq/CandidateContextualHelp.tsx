"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { KnowledgeArticle } from "@/types";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api/client";
import {
  matchArticlesForStage,
  stageHelpLabel,
} from "@/lib/contextual-faq";

type CandidateContextualHelpProps = {
  stageName: string;
};

export function CandidateContextualHelp({ stageName }: CandidateContextualHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const allArticles = await api.knowledge.list();
      const matched = matchArticlesForStage(stageName, allArticles);
      setArticles(matched);
      setSelectedArticleId(matched[0]?.id ?? null);
    } catch (err) {
      setArticles([]);
      setSelectedArticleId(null);
      setError(
        err instanceof Error ? err.message : "Не вдалося завантажити статті",
      );
    } finally {
      setIsLoading(false);
    }
  }, [stageName]);

  useEffect(() => {
    if (!isOpen) return;
    void loadArticles();
  }, [isOpen, loadArticles]);

  const selectedArticle =
    articles.find((article) => article.id === selectedArticleId) ?? articles[0];

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-slate-50"
        aria-label="Довідка за етапом"
      >
        <span aria-hidden>?</span>
        Довідка
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/30"
            aria-label="Закрити"
            onClick={() => setIsOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="contextual-help-title"
            className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted">
                  База знань
                </p>
                <h2 id="contextual-help-title" className="text-lg font-semibold text-foreground">
                  Довідка: {stageHelpLabel(stageName)}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Статті для етапу «{stageName}».
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-slate-50"
                aria-label="Закрити модальне вікно"
              >
                ×
              </button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
              <aside className="shrink-0 border-b border-border sm:w-56 sm:border-b-0 sm:border-r">
                {isLoading && (
                  <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted">
                    <Spinner className="h-4 w-4" />
                    Завантаження…
                  </div>
                )}

                {error && (
                  <div className="space-y-3 px-4 py-4 text-sm text-red-700">
                    <p>{error}</p>
                    <Button variant="outline" size="sm" onClick={loadArticles}>
                      Повторити
                    </Button>
                  </div>
                )}

                {!isLoading && !error && articles.length === 0 && (
                  <p className="px-4 py-6 text-sm text-muted">
                    Немає релевантних статей. Додайте їх у{" "}
                    <Link href="/knowledge" className="text-primary underline">
                      Базі знань
                    </Link>
                    .
                  </p>
                )}

                {!isLoading && articles.length > 0 && (
                  <ul className="max-h-48 overflow-y-auto sm:max-h-none">
                    {articles.map((article) => {
                      const isActive = article.id === selectedArticle?.id;
                      return (
                        <li key={article.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedArticleId(article.id)}
                            className={`block w-full px-4 py-3 text-left text-sm transition-colors ${
                              isActive
                                ? "bg-primary/5 font-medium text-primary"
                                : "text-foreground hover:bg-slate-50"
                            }`}
                          >
                            {article.title}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </aside>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {selectedArticle ? (
                  <article>
                    <h3 className="text-base font-semibold text-foreground">
                      {selectedArticle.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted">
                      {selectedArticle.authorName}
                    </p>
                    <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {selectedArticle.content}
                    </div>
                  </article>
                ) : (
                  !isLoading &&
                  !error && (
                    <p className="text-sm text-muted">Оберіть статтю зі списку.</p>
                  )
                )}
              </div>
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
              <Link
                href="/knowledge"
                className="text-sm font-medium text-primary hover:underline"
                onClick={() => setIsOpen(false)}
              >
                Відкрити всю Базу знань
              </Link>
              <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                Закрити
              </Button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
