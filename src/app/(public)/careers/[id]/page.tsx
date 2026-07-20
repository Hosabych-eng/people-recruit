import type { Metadata } from "next";
import { getPublicJobPosting } from "@/lib/jobs/public";
import { JobPostingLayout } from "@/components/careers/JobPostingLayout";
import { stripHtmlToText } from "@/lib/job-posting";

export const dynamic = "force-dynamic";

type JobPostingPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: JobPostingPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const job = await getPublicJobPosting(id);
    return {
      title: `${job.title} | Careers`,
      description: stripHtmlToText(job.description).slice(0, 160),
    };
  } catch {
    return { title: "Vacancy | Careers" };
  }
}

export default async function JobPostingPage({ params }: JobPostingPageProps) {
  const { id } = await params;
  const job = await getPublicJobPosting(id);

  return <JobPostingLayout job={job} />;
}
