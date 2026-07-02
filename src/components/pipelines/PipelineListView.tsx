"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { JobWithCounts } from "@/types";
import { CreatePipelineModal } from "@/components/pipelines/CreatePipelineModal";
import { EmailTemplatesPanel } from "@/components/pipelines/EmailTemplatesPanel";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName } from "@/components/ui/formStyles";
import { api } from "@/lib/api/client";
import { formatStageCountUk } from "@/lib/pipeline-stage-tags";

export function PipelineListView() {
  const router = useRouter();
  const [pipelines, setPipelines] = useState<JobWithCounts[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadPipelines = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.jobs.list();
      setPipelines(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося завантажити воронки");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPipelines();
  }, [loadPipelines]);

  const filteredPipelines = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return pipelines;

    return pipelines.filter((pipeline) =>
      pipeline.title.toLowerCase().includes(query),
    );
  }, [pipelines, search]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Налаштування
          </p>
          <h1 className="text-xl font-semibold text-foreground">Воронки найму</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Керуйте етапами та автоматизацією для кожної посади.
          </p>
        </div>

        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          + Додати
        </Button>
      </div>

      <div className="mb-5">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Пошук воронок…"
          className={formControlClassName}
        />
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadPipelines}>
            Повторити
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : filteredPipelines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-4 py-14 text-center">
          <p className="text-sm font-medium text-foreground">
            {search.trim() ? "Нічого не знайдено" : "Ще немає воронок"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {search.trim()
              ? "Спробуйте інший пошуковий запит."
              : "Створіть першу воронку за допомогою кнопки «Додати»."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <ul className="divide-y divide-border">
            {filteredPipelines.map((pipeline) => (
              <li key={pipeline.id}>
                <Link
                  href={`/pipelines/${pipeline.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {pipeline.title}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatStageCountUk(pipeline._count.stages)}
                      {pipeline._count.candidates > 0 &&
                        ` · ${pipeline._count.candidates} кандидат(ів)`}
                    </p>
                  </div>
                  <span className="shrink-0 text-muted" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <CreatePipelineModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(jobId) => {
          loadPipelines();
          router.push(`/pipelines/${jobId}`);
        }}
      />

      <EmailTemplatesPanel />
    </div>
  );
}
