import prisma from "@/lib/prisma";
import { toPublicJobPosting } from "@/lib/job-posting";
import { notFound } from "next/navigation";

export async function getPublicJobPosting(id: string) {
  const job = await prisma.job.findFirst({
    where: { id, status: "OPEN" },
  });

  if (!job) notFound();

  return toPublicJobPosting(job);
}

export async function listPublicJobPostings() {
  const jobs = await prisma.job.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      employmentType: true,
      createdAt: true,
    },
  });

  return jobs.map((job) => ({
    ...job,
    location: job.location ?? "Europe",
    employmentType: job.employmentType ?? "Full-time employment",
  }));
}
