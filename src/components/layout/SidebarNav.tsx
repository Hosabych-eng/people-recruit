"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { knowledgeNavItem } from "@/lib/knowledge-nav";
import { candidatesNavItem } from "@/lib/candidates-nav";
import { testAssignmentsNavItem } from "@/lib/test-assignments-nav";

const baseNavItems = [
  {
    href: "/recruiting",
    label: "Recruiting",
    description: "Pipeline & candidates",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="5" height="16" rx="1.5" />
        <rect x="10" y="4" width="5" height="16" rx="1.5" />
        <rect x="17" y="4" width="4" height="16" rx="1.5" />
      </svg>
    ),
  },
  candidatesNavItem,
  testAssignmentsNavItem,
  {
    href: "/analytics",
    label: "Workforce insights",
    description: "Period statistics",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 17V11" />
        <path d="M12 17V8" />
        <path d="M16 17V13" />
      </svg>
    ),
  },
  knowledgeNavItem,
];

const pipelinesNavItem = {
  href: "/pipelines",
  label: "Воронки",
  description: "Етапи та автоматизація",
  icon: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h6" />
      <path d="M4 12h10" />
      <path d="M4 17h14" />
      <circle cx="17" cy="7" r="2" />
      <circle cx="19" cy="12" r="2" />
      <circle cx="15" cy="17" r="2" />
    </svg>
  ),
};

const adminNavItem = {
  href: "/admin",
  label: "Team access",
  description: "Add HR accounts",
  icon: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M22 11h-6" />
    </svg>
  ),
};

export function SidebarNav() {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const navItems = isAdmin
    ? [...baseNavItems, pipelinesNavItem, adminNavItem]
    : baseNavItems;

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-screen md:w-[250px] md:border-b-0 md:border-r md:overflow-y-auto">
      <div className="border-b border-sidebar-border px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-accent text-sm font-bold text-white">
            PR
          </div>
          <div>
            <p className="text-sm font-semibold text-white">PeopleRecruit</p>
            <p className="text-xs text-sidebar-muted">HR workspace</p>
          </div>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 py-3 md:flex-1 md:flex-col md:space-y-1 md:overflow-visible md:py-4">
        <p className="hidden px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-muted md:block">
          Modules
        </p>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-[11rem] shrink-0 items-start gap-3 rounded-xl px-3 py-3 transition-colors md:min-w-0 ${
                isActive
                  ? "bg-sidebar-accent text-white shadow-sm"
                  : "text-sidebar-muted hover:bg-sidebar-hover hover:text-white"
              }`}
            >
              <span className="mt-0.5 shrink-0">{item.icon}</span>
              <span>
                <span className="block text-sm font-medium">{item.label}</span>
                <span
                  className={`mt-0.5 block text-xs ${
                    isActive ? "text-white/75" : "text-sidebar-muted"
                  }`}
                >
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3 md:px-5 md:py-4">
        {user && (
          <div className="mb-3 hidden md:mb-4 md:block">
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-sidebar-muted">
              {user.role === "ADMIN" ? "Administrator" : "Recruiter"}
            </p>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-hover hover:text-white md:w-full"
          onClick={() => logout()}
        >
          Sign out
        </Button>
      </div>
    </aside>
  );
}
