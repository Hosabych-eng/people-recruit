"use client";

import Link from "next/link";
import type { PublicJobPosting } from "@/lib/job-posting";

type JobPostingSidebarProps = {
  job: PublicJobPosting;
  className?: string;
};

export function JobPostingSidebar({ job, className = "" }: JobPostingSidebarProps) {
  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: job.title, url });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Посилання на вакансію:", url);
    }
  };

  return (
    <aside className={className}>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="space-y-3 lg:block hidden">
          <Link
            href={`/careers/${job.id}/apply`}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-career-accent-strong px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-career-accent-strong/90"
          >
            Відгукнутися
          </Link>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-slate-50"
          >
            <ShareIcon />
            Поділитися
          </button>
        </div>

        <dl className="space-y-4 lg:border-t lg:border-border lg:pt-6">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              Тип роботи
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {job.employmentType}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              Локація
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {job.location}
            </dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}

export function JobPostingMobileBar({ job }: { job: PublicJobPosting }) {
  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: job.title, url });
        return;
      } catch {
        // noop
      }
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Посилання на вакансію:", url);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-6xl gap-2">
        <Link
          href={`/careers/${job.id}/apply`}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-career-accent-strong px-4 text-sm font-semibold text-white"
        >
          Відгукнутися
        </Link>
        <button
          type="button"
          onClick={handleShare}
          aria-label="Поділитися"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground"
        >
          <ShareIcon />
        </button>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}
