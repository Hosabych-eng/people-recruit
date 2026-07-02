"use client";

import { useCallback, useEffect, useState } from "react";
import type { KnowledgeArticle } from "@/types";
import { CreateKnowledgeForm } from "@/components/knowledge/CreateKnowledgeForm";
import { KnowledgeArticleCard } from "@/components/knowledge/KnowledgeArticleCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api/client";

export function KnowledgeView() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.knowledge.list();
      setArticles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load articles");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-card px-4 py-5 shadow-sm sm:px-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          Knowledge base
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Team articles
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Internal documentation for HR and recruiting workflows.
        </p>
      </header>

      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Published articles
                </h2>
                <p className="text-sm text-muted">
                  {articles.length} entr{articles.length === 1 ? "y" : "ies"}
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={loadArticles}>
                  Retry
                </Button>
              </div>
            )}

            {isLoading ? (
              <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-border bg-card">
                <div className="flex flex-col items-center gap-3 text-muted">
                  <Spinner className="h-8 w-8" />
                  <p className="text-sm">Loading articles…</p>
                </div>
              </div>
            ) : articles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card px-4 py-12 text-center">
                <h3 className="text-base font-medium text-foreground">
                  No articles yet
                </h3>
                <p className="mt-2 text-sm text-muted">
                  Create the first knowledge base entry using the form.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map((article) => (
                  <KnowledgeArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </section>

          <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
            <CreateKnowledgeForm onCreated={loadArticles} />
          </aside>
        </div>
      </div>
    </div>
  );
}
