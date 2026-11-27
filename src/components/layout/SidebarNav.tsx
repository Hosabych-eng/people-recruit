"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { knowledgeNavItem } from "@/lib/knowledge-nav";
import { candidatesNavItem } from "@/lib/candidates-nav";
import { testAssignmentsNavItem } from "@/lib/test-assignments-nav";

const baseNavItems = [
  {
    href: "/recruiting",
    label: "Рекрутинг",
    description: "Воронка та кандидати",
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
    label: "Аналітика кадрів",
    description: "Статистика за період",
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
  label: "Доступ команди",
  description: "Облікові записи HR",
  icon: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M22 11h-6" />
    </svg>
  ),
};

const settingsNavItem = {
  href: "/settings",
  label: "Налаштування",
  description: "Довідники CRM",
  icon: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  ),
};

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-accent text-sm font-bold text-white">
        PR
      </div>
      <div>
        <p className="text-sm font-semibold text-white">PeopleRecruit</p>
        <p className="text-xs text-sidebar-muted">HR-робочий простір</p>
      </div>
    </div>
  );
}

function NavLinks({
  navItems,
  pathname,
  onNavigate,
}: {
  navItems: typeof baseNavItems;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-start gap-3 rounded-xl px-3 py-3 transition-colors ${
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
    </>
  );
}

export function SidebarNav() {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerTitleId = useId();
  const navItems = isAdmin
    ? [...baseNavItems, pipelinesNavItem, settingsNavItem, adminNavItem]
    : baseNavItems;

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isDrawerOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsDrawerOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isDrawerOpen]);

  return (
    <>
      {/* Mobile compact header */}
      <header className="sticky top-0 z-30 flex w-full items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
        <BrandMark />
        <button
          type="button"
          aria-label={isDrawerOpen ? "Закрити меню" : "Відкрити меню"}
          aria-expanded={isDrawerOpen}
          aria-controls="mobile-nav-drawer"
          onClick={() => setIsDrawerOpen((open) => !open)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sidebar-border text-white transition-colors hover:bg-sidebar-hover"
        >
          {isDrawerOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </header>

      {/* Mobile drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="presentation">
          <button
            type="button"
            aria-label="Закрити меню"
            className="absolute inset-0 bg-black/45"
            onClick={() => setIsDrawerOpen(false)}
          />
          <aside
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={drawerTitleId}
            className="absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col bg-sidebar text-sidebar-foreground shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
              <div id={drawerTitleId}>
                <BrandMark />
              </div>
              <button
                type="button"
                aria-label="Закрити меню"
                onClick={() => setIsDrawerOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-muted hover:bg-sidebar-hover hover:text-white"
              >
                <CloseIcon />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-muted">
                Модулі
              </p>
              <NavLinks
                navItems={navItems}
                pathname={pathname}
                onNavigate={() => setIsDrawerOpen(false)}
              />

              <p className="px-3 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-muted">
                Інструменти
              </p>
              <a
                href="/settings/parser"
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-start gap-3 rounded-xl px-3 py-3 text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-white"
              >
                <span className="mt-0.5 shrink-0">
                  <DownloadIcon />
                </span>
                <span>
                  <span className="block text-sm font-medium">Завантажити парсер LinkedIn</span>
                  <span className="mt-0.5 block text-xs">Розширення для Chrome</span>
                </span>
              </a>
            </nav>

            <div className="border-t border-sidebar-border px-4 py-4">
              {user && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-sidebar-muted">
                    {user.role === "ADMIN" ? "Адміністратор" : "Рекрутер"}
                  </p>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-hover hover:text-white"
                onClick={() => {
                  setIsDrawerOpen(false);
                  logout();
                }}
              >
                Вийти
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-[250px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen md:overflow-y-auto">
        <div className="border-b border-sidebar-border px-5 py-6">
          <BrandMark />
        </div>

        <nav className="flex flex-1 flex-col space-y-1 px-3 py-4">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-muted">
            Модулі
          </p>
          <NavLinks navItems={navItems} pathname={pathname} />

          <div>
            <p className="px-3 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-muted">
              Інструменти
            </p>
            <a
              href="/settings/parser"
              className="flex items-start gap-3 rounded-xl px-3 py-3 text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-white"
            >
              <span className="mt-0.5 shrink-0">
                <DownloadIcon />
              </span>
              <span>
                <span className="block text-sm font-medium">Завантажити парсер LinkedIn</span>
                <span className="mt-0.5 block text-xs">Розширення для Chrome</span>
              </span>
            </a>
          </div>
        </nav>

        <div className="border-t border-sidebar-border px-5 py-4">
          {user && (
            <div className="mb-4">
              <p className="text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-sidebar-muted">
                {user.role === "ADMIN" ? "Адміністратор" : "Рекрутер"}
              </p>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-hover hover:text-white"
            onClick={() => logout()}
          >
            Вийти
          </Button>
        </div>
      </aside>
    </>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}
