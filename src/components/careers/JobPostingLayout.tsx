import type { PublicJobPosting } from "@/lib/job-posting";
import { JobPostingBreadcrumb } from "@/components/careers/JobPostingBreadcrumb";
import { JobPostingContent } from "@/components/careers/JobPostingContent";
import {
  JobPostingMobileBar,
  JobPostingSidebar,
} from "@/components/careers/JobPostingSidebar";

type JobPostingLayoutProps = {
  job: PublicJobPosting;
};

export function JobPostingLayout({ job }: JobPostingLayoutProps) {
  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-12">
      <JobPostingBreadcrumb title={job.title} />

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:gap-10 xl:gap-12">
          <JobPostingContent job={job} />

          <JobPostingSidebar
            job={job}
            className="lg:sticky lg:top-6 lg:self-start"
          />
        </div>
      </div>

      <JobPostingMobileBar job={job} />
    </div>
  );
}
