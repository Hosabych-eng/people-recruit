"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CandidateWithRelations } from "@/types";
import { ImportCandidateModal } from "@/components/candidate/ImportCandidateModal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName } from "@/components/ui/formStyles";
import { getSourceLabel } from "@/lib/application-sources";
import { api } from "@/lib/api/client";
import type { ApplicationSource } from "@prisma/client";

function formatAddedDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

type ImportPipeline = {
  id: string;
  title: string;
  stages: { id: string; name: string }[];
};

export function CandidatesDatabaseView() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<CandidateWithRelations[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importPipeline, setImportPipeline] = useState<ImportPipeline | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchQuery.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const loadCandidates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.candidates.list({
        q: debouncedQuery || undefined,
      });
      setCandidates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося завантажити кандидатів");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const openImportForFirstJob = async () => {
    try {
      const jobs = await api.jobs.list();
      const job = jobs.find((item) => item.status === "OPEN") ?? jobs[0];
      if (!job) {
        setError("Спочатку створіть вакансію для імпорту кандидата");
        return;
      }
      const pipeline = await api.jobs.pipeline(job.id);
      setImportPipeline({
        id: pipeline.id,
        title: pipeline.title,
        stages: pipeline.stages.map((stage) => ({ id: stage.id, name: stage.name })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося підготувати імпорт");
    }
  };

  const handleDelete = async (candidateId: string, candidateName: string) => {
    const confirmed = window.confirm(
      `Видалити кандидата «${candidateName}»? Цю дію не можна скасувати.`,
    );
    if (!confirmed) return;

    setDeletingId(candidateId);
    setError(null);

    try {
      await api.candidates.delete(candidateId);
      setCandidates((current) => current.filter((item) => item.id !== candidateId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося видалити кандидата");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-card px-4 py-5 shadow-sm sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Recruiting
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              База кандидатів
            </h1>
            <p className="mt-1 text-sm text-muted">
              Усі кандидати з усіх вакансій
            </p>
          </div>
          <Button size="sm" onClick={() => void openImportForFirstJob()}>
            Імпортувати кандидата
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
        <div className="mb-4">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Пошук за ім'ям, email або URL профілю…"
            className={formControlClassName}
          />
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-border bg-card">
            <Spinner className="h-8 w-8" />
          </div>
        ) : candidates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <p className="text-sm text-muted">Кандидатів не знайдено.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Ім&apos;я</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Профіль</th>
                  <th className="px-4 py-3">Вакансія</th>
                  <th className="px-4 py-3">Етап</th>
                  <th className="px-4 py-3">Джерело</th>
                  <th className="px-4 py-3">Додано</th>
                  <th className="px-4 py-3 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {candidates.map((candidate) => (
                  <tr
                    key={candidate.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => router.push(`/candidates/${candidate.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {candidate.name}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {candidate.email ?? "—"}
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-3">
                      {candidate.resumeLink ? (
                        <a
                          href={candidate.resumeLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {candidate.resumeLink}
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{candidate.job.title}</td>
                    <td className="px-4 py-3 text-muted">{candidate.stage.name}</td>
                    <td className="px-4 py-3 text-muted">
                      {getSourceLabel(candidate.applicationSource as ApplicationSource)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatAddedDate(String(candidate.createdAt))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        aria-label={`Видалити ${candidate.name}`}
                        disabled={deletingId === candidate.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDelete(candidate.id, candidate.name);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                      >
                        {deletingId === candidate.id ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          <TrashIcon />
                        )}
                        <span>Видалити</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-sm text-muted">
          Потрібна воронка?{" "}
          <Link href="/recruiting" className="font-medium text-primary hover:underline">
            Перейти до Recruiting
          </Link>
        </p>
      </div>

      {importPipeline && (
        <ImportCandidateModal
          pipeline={importPipeline}
          isOpen
          onClose={() => setImportPipeline(null)}
          onImported={() => void loadCandidates()}
        />
      )}
    </div>
  );
}
