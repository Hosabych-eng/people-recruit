"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  CreateVacancyModal,
  type CreatedVacancy,
} from "@/components/careers/CreateVacancyModal";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import type { JobWithCounts } from "@/types";

export type CareersJobItem = {
  id: string;
  title: string;
  description: string;
  location: string;
  employmentType: string;
};

type CareersPageClientProps = {
  initialJobs: CareersJobItem[];
  canManage: boolean;
};

function mapOpenJobs(jobs: JobWithCounts[]): CareersJobItem[] {
  return jobs
    .filter((job) => job.status === "OPEN")
    .map((job) => ({
      id: job.id,
      title: job.title,
      description: job.description,
      location: job.location ?? "Europe",
      employmentType: job.employmentType ?? "Full-time employment",
    }));
}

function mapCreatedJob(job: CreatedVacancy): CareersJobItem {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    location: job.location ?? "Europe",
    employmentType: job.employmentType ?? "Full-time employment",
  };
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

export function CareersPageClient({
  initialJobs,
  canManage,
}: CareersPageClientProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  useEffect(() => {
    return () => setIsModalOpen(false);
  }, []);

  const reloadJobs = useCallback(async () => {
    const allJobs = await api.jobs.list();
    setJobs(mapOpenJobs(allJobs));
  }, []);

  const handleCreated = (job: CreatedVacancy) => {
    setError(null);
    setJobs((current) => [mapCreatedJob(job), ...current]);
    setIsModalOpen(false);
    router.refresh();
  };

  const handleDelete = async (jobId: string, jobTitle: string) => {
    const confirmed = window.confirm(
      `Видалити вакансію «${jobTitle}»? Цю дію не можна скасувати.`,
    );
    if (!confirmed) return;

    setDeletingId(jobId);
    setError(null);

    try {
      await api.jobs.delete(jobId);
      setJobs((current) => current.filter((job) => job.id !== jobId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося видалити вакансію");
      try {
        await reloadJobs();
      } catch {
        // Keep optimistic UI if refresh fails.
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="relative">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Відкриті вакансії
          </h1>
          <p className="mt-2 text-muted">
            Ознайомтеся з актуальними можливостями та подайте заявку онлайн.
          </p>
        </div>

        {canManage && (
          <Button
            type="button"
            onClick={() => {
              setError(null);
              setIsModalOpen(true);
            }}
            className="shrink-0 bg-career-accent-strong hover:bg-career-accent-strong/90"
          >
            + Створити вакансію
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-muted">Наразі немає відкритих вакансій.</p>
          {canManage && (
            <Button
              type="button"
              className="mt-4 bg-career-accent-strong hover:bg-career-accent-strong/90"
              onClick={() => setIsModalOpen(true)}
            >
              + Створити вакансію
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-4">
          {jobs.map((job) => (
            <li key={job.id}>
              <div className="group relative rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                <Link href={`/careers/${job.id}`} className="block pr-12">
                  <h2 className="text-lg font-semibold text-foreground">{job.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{job.description}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-career-accent-strong">
                    <span>{job.employmentType}</span>
                    <span aria-hidden>•</span>
                    <span>{job.location}</span>
                  </div>
                </Link>

                {canManage && (
                  <button
                    type="button"
                    aria-label={`Видалити ${job.title}`}
                    disabled={deletingId === job.id}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void handleDelete(job.id, job.title);
                    }}
                    className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <CreateVacancyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
