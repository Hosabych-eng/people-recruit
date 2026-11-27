"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CandidateWithRelations } from "@/types";
import { ImportCandidateModal } from "@/components/candidate/ImportCandidateModal";
import { CandidateAvatar } from "@/components/ui/CandidateAvatar";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName } from "@/components/ui/formStyles";
import { getSourceLabel } from "@/lib/application-sources";
import { isRejectedStageName } from "@/lib/pipeline-utils";
import {
  exportCandidatesToCsv,
  exportCandidatesToXlsx,
} from "@/lib/candidates-export";
import { api } from "@/lib/api/client";
import type { ApplicationSource } from "@prisma/client";

const PAGE_SIZE = 40;

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

async function fetchAllFilteredCandidates(q?: string) {
  const first = await api.candidates.list({
    q,
    page: 1,
    pageSize: PAGE_SIZE,
  });
  if (first.total <= first.items.length) return first.items;

  const totalPages = Math.ceil(first.total / PAGE_SIZE);
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      api.candidates.list({
        q,
        page: index + 2,
        pageSize: PAGE_SIZE,
      }),
    ),
  );
  return [...first.items, ...rest.flatMap((page) => page.items)];
}

export function CandidatesDatabaseView() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<CandidateWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importPipeline, setImportPipeline] = useState<ImportPipeline | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchQuery.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const loadCandidates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.candidates.list({
        q: debouncedQuery || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setCandidates(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося завантажити кандидатів");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, page]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const openImportForFirstJob = async () => {
    try {
      const jobs = await api.jobs.list();
      const job = jobs.find((item) => item.status === "OPEN") ?? jobs[0];
      if (!job) {
        setError("Спочатку створіть вакансію для імпорту кандидата");
        return;
      }

      const stages =
        job.stages?.length > 0
          ? job.stages.map((stage) => ({ id: stage.id, name: stage.name }))
          : (await api.stages.list(job.id)).map((stage) => ({
              id: stage.id,
              name: stage.name,
            }));

      if (stages.length === 0) {
        setError("У вакансії немає етапів воронки");
        return;
      }

      setImportPipeline({
        id: job.id,
        title: job.title,
        stages,
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
      setTotal((current) => Math.max(0, current - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося видалити кандидата");
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const rows = await fetchAllFilteredCandidates(debouncedQuery || undefined);
      exportCandidatesToCsv(rows, "candidates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося експортувати CSV");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportXlsx = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const rows = await fetchAllFilteredCandidates(debouncedQuery || undefined);
      exportCandidatesToXlsx(rows, "bazа_кандидатів");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося експортувати Excel");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-card px-4 py-5 shadow-sm sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Рекрутинг
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              База кандидатів
            </h1>
            <p className="mt-1 text-sm text-muted">
              Усі кандидати з усіх вакансій
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={total === 0 || isExporting}
              onClick={() => void handleExportCsv()}
            >
              {isExporting ? "Експорт…" : "Експорт у CSV"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={total === 0 || isExporting}
              onClick={() => void handleExportXlsx()}
            >
              Експорт в Excel
            </Button>
            <Button size="sm" onClick={() => void openImportForFirstJob()}>
              Імпортувати кандидата
            </Button>
          </div>
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
          <>
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-2">Кандидат</th>
                    <th className="px-4 py-2">Вакансія / Етап</th>
                    <th className="px-4 py-2">Останній коментар</th>
                    <th className="px-4 py-2 text-right">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {candidates.map((candidate) => {
                    const isRejected = isRejectedStageName(candidate.stage.name);
                    const lastComment = candidate.lastNote?.content ?? "—";

                    return (
                      <tr
                        key={candidate.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => router.push(`/candidates/${candidate.id}`)}
                      >
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <CandidateAvatar
                              name={candidate.name}
                              avatarUrl={candidate.avatarUrl}
                              seed={candidate.id}
                              size="sm"
                              className="!h-8 !w-8"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {candidate.name}
                              </p>
                              <p className="truncate text-xs text-muted">
                                {candidate.email ?? "—"}
                              </p>
                              {isRejected && candidate.rejectionReason && (
                                <span className="mt-0.5 inline-block rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-700">
                                  {candidate.rejectionReason.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-xs text-muted">
                          <p className="font-medium text-foreground">{candidate.job.title}</p>
                          <p>{candidate.stage.name}</p>
                          <p className="text-[11px]">
                            {getSourceLabel(candidate.applicationSource as ApplicationSource)} ·{" "}
                            {formatAddedDate(String(candidate.createdAt))}
                          </p>
                        </td>
                        <td className="max-w-xs px-4 py-2 text-xs text-muted">
                          <p className="line-clamp-2">{lastComment}</p>
                        </td>
                        <td className="px-4 py-2 text-right">
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {total === 0
                  ? "0 кандидатів"
                  : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} з ${total}`}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canPrev || isLoading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Назад
                </Button>
                <span className="text-sm text-muted">
                  {page} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canNext || isLoading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Далі
                </Button>
              </div>
            </div>
          </>
        )}

        <p className="mt-4 text-sm text-muted">
          Потрібна воронка?{" "}
          <Link href="/recruiting" className="font-medium text-primary hover:underline">
            Перейти до Рекрутингу
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
