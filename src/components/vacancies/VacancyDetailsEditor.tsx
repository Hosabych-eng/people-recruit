"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import type { JobDetail, JobWithPipeline } from "@/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formLabelClassName } from "@/components/ui/formStyles";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { JOB_LOCATION_OPTIONS } from "@/lib/job-locations";
import { JobDescriptionRichTextEditor } from "@/components/jobs/JobDescriptionRichTextEditor";
import { noteHtmlIsEmpty } from "@/lib/note-html";
import { VacancyPipelineHeader } from "@/components/pipeline/VacancyPipelineHeader";

type VacancyDetailsEditorProps = {
  jobId: string;
};

type JobDetailWithRecruiters = JobDetail & {
  recruiters?: Array<{ id: string }>;
};

export function VacancyDetailsEditor({ jobId }: VacancyDetailsEditorProps) {
  const { isAdmin } = useAuth();

  const [job, setJob] = useState<JobDetailWithRecruiters | null>(null);
  const [pipeline, setPipeline] = useState<JobWithPipeline | null>(null);
  const [recruiters, setRecruiters] = useState<
    Array<{ id: string; name: string | null; email: string; image: string | null }>
  >([]);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<string | null>(null);
  const [selectedRecruiterIds, setSelectedRecruiterIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      api.jobs.get(jobId),
      api.jobs.pipeline(jobId),
      api.recruiters.list(),
    ]).then(([jobResp, pipelineResp, recruitersResp]) => {
        if (cancelled) return;
        setJob(jobResp as JobDetailWithRecruiters);
        setPipeline(pipelineResp);
        setRecruiters(recruitersResp);

        const jobWithRecruiters = jobResp as JobDetailWithRecruiters;
        setDescription(jobWithRecruiters.description ?? "");
        setLocation(jobWithRecruiters.location ?? "Europe");
        setSelectedRecruiterIds(
          jobWithRecruiters.recruiters?.map((r: { id: string }) => r.id) ?? [],
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Не вдалося завантажити вакансію");
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const recruiterItems = useMemo(
    () =>
      recruiters.map((row) => ({
        value: row.id,
        label: row.name ?? row.email,
      })),
    [recruiters],
  );

  const locationItems = useMemo(() => JOB_LOCATION_OPTIONS, []);

  const handleSave = async () => {
    if (!job) return;
    if (!isAdmin) return;

    if (noteHtmlIsEmpty(description)) {
      setError("Опис є обовʼязковим");
      return;
    }
    if (!location) {
      setError("Локація є обовʼязковою");
      return;
    }
    if (selectedRecruiterIds.length === 0) {
      setError("Потрібно вибрати хоча б одного рекрутера");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const next = await api.jobs.update(jobId, {
        description: description.trim(),
        location: location.trim(),
        recruiterIds: selectedRecruiterIds,
      });
      // JobDetail response shape differs from update response; local state is already up to date.
      void next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося зберегти");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-sm text-muted">Вакансію не знайдено.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      {pipeline && (
        <VacancyPipelineHeader
          pipeline={pipeline}
          activeTab="details"
          canManageJob={isAdmin}
          onTabChange={(tab) => {
            if (tab === "cycle") {
              window.location.href = `/recruiting?job=${pipeline.id}`;
            }
            if (tab === "reports") {
              window.location.href = `/vacancies/${pipeline.id}/reports`;
            }
          }}
          onEdit={() => {
            window.location.href = `/pipelines/${pipeline.id}`;
          }}
          onShare={() => {
            const url = `${window.location.origin}/vacancies/${pipeline.id}/details`;
            void navigator.clipboard.writeText(url);
          }}
        />
      )}
      <div className="mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{job.title}</h1>
            <p className="mt-1 text-sm text-muted">Деталі вакансії</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-5 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div>
            <label className={formLabelClassName}>Опис</label>
            <div className="mt-2">
              <JobDescriptionRichTextEditor
                value={description}
                onChange={setDescription}
                disabled={!isAdmin || isSaving}
              />
            </div>
          </div>

          <div>
            <label className={formLabelClassName}>Локація</label>
            <div className="mt-2">
              <SearchableSelect
                items={locationItems}
                value={location}
                onChange={setLocation}
                disabled={!isAdmin || isSaving}
              />
            </div>
          </div>

          <div>
            <label className={formLabelClassName}>Рекрутери</label>
            <div className="mt-2">
              <MultiSelect
                items={recruiterItems}
                value={selectedRecruiterIds}
                onChange={setSelectedRecruiterIds}
                disabled={!isAdmin || isSaving}
              />
            </div>
          </div>

          {!isAdmin && (
            <p className="text-xs text-muted">
              Редагування доступне тільки адміністраторам.
            </p>
          )}

          {isAdmin && (
            <div className="pt-2">
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                {isSaving ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    Збереження…
                  </span>
                ) : (
                  "Зберегти зміни"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

