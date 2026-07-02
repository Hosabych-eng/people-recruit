import { CareersPageClient } from "@/app/(public)/careers/CareersPageClient";
import { getSessionUser } from "@/lib/auth/server";
import { canManageVacancies } from "@/lib/auth-session";
import { listPublicJobPostings } from "@/lib/jobs/public";

export const dynamic = "force-dynamic";

export default async function CareersPage() {
  const [jobs, session] = await Promise.all([
    listPublicJobPostings(),
    getSessionUser(),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <CareersPageClient
        initialJobs={jobs}
        canManage={canManageVacancies(session)}
      />
    </main>
  );
}
