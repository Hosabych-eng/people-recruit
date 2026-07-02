import Link from "next/link";

type JobPostingBreadcrumbProps = {
  title: string;
};

export function JobPostingBreadcrumb({ title }: JobPostingBreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="border-b border-career-accent/20 bg-career-accent/10"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center px-4 py-3 text-sm sm:px-6">
        <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-career-accent">
          <li>
            <Link
              href="/careers"
              className="font-medium transition-colors hover:text-career-accent-strong"
            >
              Головна
            </Link>
          </li>
          <li aria-hidden className="text-career-accent/70">
            &gt;
          </li>
          <li className="min-w-0 truncate font-medium text-career-accent-strong">
            {title}
          </li>
        </ol>
      </div>
    </nav>
  );
}
