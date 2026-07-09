"use client";

import Link from "next/link";

export type CareersJobItem = {
  id: string;
  title: string;
  description: string;
  location: string;
  employmentType: string;
};

type CareersPageClientProps = {
  jobs: CareersJobItem[];
};

export function CareersPageClient({ jobs }: CareersPageClientProps) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Відкриті вакансії
        </h1>
        <p className="mt-2 text-muted">
          Ознайомтеся з актуальними можливостями та подайте заявку онлайн.
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-muted">Наразі немає відкритих вакансій.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/careers/${job.id}`}
                className="block rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <h2 className="text-lg font-semibold text-foreground">{job.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm text-muted">{job.description}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-career-accent-strong">
                  <span>{job.employmentType}</span>
                  <span aria-hidden>•</span>
                  <span>{job.location}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
