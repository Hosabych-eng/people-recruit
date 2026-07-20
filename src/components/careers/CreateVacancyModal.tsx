"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Job, Stage } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";
import { api } from "@/lib/api/client";
import { noteHtmlIsEmpty } from "@/lib/note-html";
import { JobDescriptionRichTextEditor } from "@/components/jobs/JobDescriptionRichTextEditor";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { JOB_LOCATION_OPTIONS } from "@/lib/job-locations";
import type { JobWithCounts } from "@/types";

export type CreatedVacancy = Job & { stages: Stage[] };

type CreateVacancyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (job: CreatedVacancy) => void;
};

const EMPLOYMENT_TYPES = [
  "Full-time employment",
  "Part-time employment",
  "Contract",
  "Internship",
];

export function CreateVacancyModal({
  isOpen,
  onClose,
  onCreated,
}: CreateVacancyModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [employmentType, setEmploymentType] = useState(EMPLOYMENT_TYPES[0]);
  const [location, setLocation] = useState<string | null>("Europe");
  const [pipelineTemplates, setPipelineTemplates] = useState<JobWithCounts[]>([]);
  const [hiringPipelineId, setHiringPipelineId] = useState<string | null>(null);
  const [recruiters, setRecruiters] = useState<
    Array<{ id: string; name: string | null; email: string; image: string | null }>
  >([]);
  const [selectedRecruiterIds, setSelectedRecruiterIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setTitle("");
    setDescription("");
    setEmploymentType(EMPLOYMENT_TYPES[0]);
    setLocation("Europe");
    setHiringPipelineId(null);
    setSelectedRecruiterIds([]);
    setPipelineTemplates([]);
    setRecruiters([]);
    setError(null);
    setIsSubmitting(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setIsLoadingMeta(true);
    setError(null);

    Promise.all([api.jobs.list(), api.recruiters.list()])
      .then(([jobs, recruiters]) => {
        if (cancelled) return;

        const drafts = jobs.filter((job) => job.status === "DRAFT");
        setPipelineTemplates(drafts);
        if (drafts.length > 0) setHiringPipelineId(drafts[0].id);

        setRecruiters(recruiters);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Не вдалося завантажити дані");
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingMeta(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!title.trim()) {
        throw new Error("Назва є обовʼязковою");
      }
      if (noteHtmlIsEmpty(description)) {
        throw new Error("Опис є обовʼязковим");
      }
      if (!location) {
        throw new Error("Локація є обовʼязковою");
      }
      if (!hiringPipelineId) {
        throw new Error("Етапи вакансії є обовʼязковими");
      }
      if (selectedRecruiterIds.length === 0) {
        throw new Error("Потрібно вибрати хоча б одного рекрутера");
      }

      const locationValue = location.trim();

      const job = await api.jobs.create({
        title: title.trim(),
        description: description.trim(),
        employmentType: employmentType.trim(),
        location: locationValue,
        status: "OPEN",
        pipelineId: hiringPipelineId,
        recruiterIds: selectedRecruiterIds,
      });
      onCreated(job);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося створити вакансію");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Закрити"
        className="absolute inset-0 bg-slate-900/30"
        onClick={onClose}
        disabled={isSubmitting}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-vacancy-title"
        className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Вакансії
          </p>
          <h2 id="create-vacancy-title" className="text-lg font-semibold text-foreground">
            Нова вакансія
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <label className="block">
            <span className={formLabelClassName}>Назва</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              className={formControlClassName}
              placeholder="Trainee/Junior QA (Ukraine)"
            />
          </label>

          <label className="block">
            <span className={formLabelClassName}>Опис</span>
            <JobDescriptionRichTextEditor value={description} onChange={setDescription} disabled={isLoadingMeta} />
          </label>

          <label className="block">
            <span className={formLabelClassName}>Тип роботи</span>
            <select
              value={employmentType}
              onChange={(event) => setEmploymentType(event.target.value)}
              className={formControlClassName}
            >
              {EMPLOYMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={formLabelClassName}>Локація</span>
            <SearchableSelect
              items={JOB_LOCATION_OPTIONS}
              value={location}
              onChange={setLocation}
              disabled={isLoadingMeta}
            />
          </label>

          <label className="block">
            <span className={formLabelClassName}>Етапи вакансії</span>
            <SearchableSelect
              items={pipelineTemplates.map((job) => ({
                value: job.id,
                label: `${job.title} · ${job.stages.length} етап(ів)`,
              }))}
              value={hiringPipelineId}
              onChange={setHiringPipelineId}
              placeholder={isLoadingMeta ? "Завантаження…" : "Оберіть етапи вакансії"}
              disabled={isLoadingMeta || pipelineTemplates.length === 0}
            />
          </label>

          <label className="block">
            <span className={formLabelClassName}>Рекрутери</span>
            <MultiSelect
              items={recruiters.map((row) => ({
                value: row.id,
                label: row.name ?? row.email,
              }))}
              value={selectedRecruiterIds}
              onChange={setSelectedRecruiterIds}
              placeholder={isLoadingMeta ? "Завантаження…" : "Оберіть рекрутера(ів)"}
              disabled={isLoadingMeta || recruiters.length === 0}
            />
            <p className="mt-1 text-xs text-muted">
              Щонайменше один рекрутер.
            </p>
          </label>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Скасувати
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Створення…
                </span>
              ) : (
                "Створити"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
