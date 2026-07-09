import { CareersPageClient } from "@/app/(public)/careers/CareersPageClient";
import { listPublicJobPostings } from "@/lib/jobs/public";

export const dynamic = "force-dynamic";

export default async function CareersPage() {
  const jobs = await listPublicJobPostings();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <CareersPageClient jobs={jobs} />
    </main>
  );
}
