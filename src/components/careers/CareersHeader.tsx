import Link from "next/link";

export function CareersHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/careers" className="text-lg font-semibold text-foreground">
          PeopleRecruit
        </Link>
      </div>
    </header>
  );
}
