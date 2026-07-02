import Link from "next/link";
import { getSessionUser } from "@/lib/auth/server";
import { canManageVacancies } from "@/lib/auth-session";

export async function CareersHeader() {
  const session = await getSessionUser();
  const isStaff = canManageVacancies(session);

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/careers" className="text-lg font-semibold text-foreground">
          PeopleRecruit
        </Link>

        {isStaff && (
          <Link
            href="/recruiting"
            className="text-sm font-medium text-career-accent-strong transition-colors hover:text-career-accent"
          >
            Панель рекрутингу
          </Link>
        )}
      </div>
    </header>
  );
}
