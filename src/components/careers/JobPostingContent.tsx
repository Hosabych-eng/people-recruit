import type { PublicJobPosting } from "@/lib/job-posting";
import { JobBulletList } from "@/components/careers/JobBulletList";
import { isProbablyHtml, sanitizeNoteHtml } from "@/lib/note-html";

type JobPostingContentProps = {
  job: PublicJobPosting;
};

export function JobPostingContent({ job }: JobPostingContentProps) {
  return (
    <article className="min-w-0">
      <header className="mb-8 border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {job.title}
        </h1>
      </header>

      {job.description && (
        <section className="mb-10">
          <div className="prose-career text-[15px] leading-7 text-foreground/90">
            {isProbablyHtml(job.description) ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: sanitizeNoteHtml(job.description),
                }}
              />
            ) : (
              job.description.split("\n\n").map((paragraph) => (
                <p key={paragraph} className="mb-4 last:mb-0">
                  {paragraph}
                </p>
              ))
            )}
          </div>
        </section>
      )}

      {job.responsibilities.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            Responsibilities
          </h2>
          <JobBulletList items={job.responsibilities} />
        </section>
      )}

      {job.requiredSkills.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            Required Skills
          </h2>
          <JobBulletList items={job.requiredSkills} />
        </section>
      )}

      {job.weOffer.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            We offer
          </h2>
          <JobBulletList items={job.weOffer} />
        </section>
      )}
    </article>
  );
}
