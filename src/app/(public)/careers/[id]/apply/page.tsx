import { JobApplyForm } from "@/components/careers/JobApplyForm";
import { JobPostingBreadcrumb } from "@/components/careers/JobPostingBreadcrumb";
import { getPublicJobPosting } from "@/lib/jobs/public";

export const dynamic = "force-dynamic";

type JobApplyPageProps = {
  params: Promise<{ id: string }>;
};

export default async function JobApplyPage({ params }: JobApplyPageProps) {
  const { id } = await params;
  const job = await getPublicJobPosting(id);

  return (
    <div className="min-h-screen bg-background pb-12">
      <JobPostingBreadcrumb title={job.title} />

      <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
        <JobApplyForm jobId={job.id} jobTitle={job.title} />
      </main>
    </div>
  );
}
