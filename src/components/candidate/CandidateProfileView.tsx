"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CandidateProfile } from "@/types";
import { CandidateEmailsTab } from "@/components/candidate/CandidateEmailsTab";
import { CandidateOffersTab } from "@/components/candidate/CandidateOffersTab";
import { CandidateDocumentsTab } from "@/components/candidate/CandidateDocumentsTab";
import { CandidateTestAssignmentsTab } from "@/components/candidate/CandidateTestAssignmentsTab";
import { CandidateHomeTab } from "@/components/candidate/CandidateHomeTab";
import { CandidateHistoryTab } from "@/components/candidate/CandidateHistoryTab";
import { InterviewsTab } from "@/components/candidate/InterviewsTab";
import { useAuth } from "@/components/auth/AuthProvider";
import { CandidateAvatar } from "@/components/ui/CandidateAvatar";
import { PROFILE_TABS, type CandidateProfileTab } from "@/lib/candidate-profile";
import { CandidateProfileDetails } from "@/components/candidate/CandidateProfileDetails";
import { EditCandidateModal } from "@/components/candidate/EditCandidateModal";
import { Toast } from "@/components/ui/Toast";
import { getSourceLabel } from "@/lib/application-sources";
import { maskCandidateName } from "@/lib/blind-hiring";
import { api } from "@/lib/api/client";
import type { ApplicationSource } from "@prisma/client";
import { CandidateContextualHelp } from "@/components/faq/CandidateContextualHelp";
import { isContextualFaqEnabled } from "@/lib/feature-flags";

type CandidateProfileViewProps = {
  profile: CandidateProfile;
  variant?: "page" | "drawer";
  onClose?: () => void;
  blindHiring?: boolean;
};

const ENABLED_TABS = new Set<CandidateProfileTab>([
  "home",
  "offers",
  "interviews",
  "emails",
  "test-assignments",
  "documents",
  "history",
]);

function formatAddedDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function CandidateProfileView({
  profile: initialProfile,
  variant = "page",
  onClose,
  blindHiring = false,
}: CandidateProfileViewProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState(initialProfile);
  const isDrawer = variant === "drawer";
  const [activeTab, setActiveTab] = useState<CandidateProfileTab>("home");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [neighbors, setNeighbors] = useState<{
    prevId: string | null;
    nextId: string | null;
    position: number | null;
    total: number;
  } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  useEffect(() => {
    if (isDrawer) return;
    void api.candidates.neighbors(profile.id).then(setNeighbors).catch(() => setNeighbors(null));
  }, [isDrawer, profile.id]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isMenuOpen]);

  const handleDeleteCandidate = async () => {
    if (!window.confirm(`Видалити кандидата ${profile.name}?`)) return;
    try {
      await api.candidates.delete(profile.id);
      if (isDrawer) {
        onClose?.();
      } else {
        router.push("/recruiting");
      }
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Не вдалося видалити кандидата");
    }
  };

  const recruiterName = user?.name ?? "Recruiter";
  const recruiterEmail =
    process.env.NEXT_PUBLIC_RECRUITING_SENDER_EMAIL ?? "recruiting@people-recruit.local";

  const handleInterviewScheduled = async () => {
    const updated = await api.candidates.profile(profile.id);
    setProfile(updated);
    setActiveTab("emails");
  };

  const handleProfileSaveSuccess = (updated: CandidateProfile) => {
    setProfile(updated);
    setToastMessage("Профіль кандидата збережено");
  };

  const handleTestAssignmentSent = (assignment: CandidateProfile["testAssignments"][number]) => {
    setProfile((current) => ({
      ...current,
      testAssignments: [assignment, ...current.testAssignments],
    }));
    setToastMessage("Тестове завдання надіслано");
  };

  const handleDocumentsChange = (documents: CandidateProfile["documents"]) => {
    setProfile((current) => ({ ...current, documents }));
    setToastMessage("Документи оновлено");
  };

  const handleEmailSent = (email: CandidateProfile["emails"][number]) => {
    setProfile((current) => ({
      ...current,
      emails: [email, ...current.emails],
    }));
    setToastMessage("Лист надіслано");
  };

  const displayName = blindHiring
    ? maskCandidateName(profile.name, profile.id)
    : profile.name;

  const handleClose = () => {
    if (isDrawer) {
      onClose?.();
      return;
    }
    router.push("/recruiting");
  };

  return (
    <div
      className={
        isDrawer
          ? "flex h-full min-h-0 flex-col overflow-hidden bg-background"
          : "flex min-h-full flex-col bg-background"
      }
    >
      <header className="shrink-0 border-b border-border bg-card px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <CandidateAvatar
              name={displayName}
              avatarUrl={blindHiring ? null : profile.avatarUrl}
              seed={profile.id}
              size="md"
            />
            <div className="min-w-0">
              {isDrawer && (
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                  Quick Peek
                </p>
              )}
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {displayName}
              </h1>
              <p className="mt-1 text-sm text-muted">
                Додано {formatAddedDate(profile.createdAt)},{" "}
                {getSourceLabel(profile.applicationSource as ApplicationSource)}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isContextualFaqEnabled && (
              <CandidateContextualHelp stageName={profile.stage.name} />
            )}
            {!isDrawer && (
              <>
                <button
                  type="button"
                  aria-label="Попередній кандидат"
                  disabled={!neighbors?.prevId}
                  onClick={() => neighbors?.prevId && router.push(`/candidates/${neighbors.prevId}`)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Наступний кандидат"
                  disabled={!neighbors?.nextId}
                  onClick={() => neighbors?.nextId && router.push(`/candidates/${neighbors.nextId}`)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ›
                </button>
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    aria-label="Меню"
                    aria-expanded={isMenuOpen}
                    onClick={() => setIsMenuOpen((open) => !open)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:bg-slate-50"
                  >
                    ···
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-border bg-card py-1 shadow-lg">
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsEditOpen(true);
                        }}
                      >
                        Редагувати профіль
                      </button>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setIsMenuOpen(false);
                          void handleDeleteCandidate();
                        }}
                      >
                        Видалити кандидата
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-slate-50"
            >
              Закрити
              <span aria-hidden>×</span>
            </button>
          </div>
        </div>

        <nav className="mt-5 -mb-px flex gap-1 overflow-x-auto" aria-label="Розділи профілю">
          {PROFILE_TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            const isEnabled = ENABLED_TABS.has(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => isEnabled && setActiveTab(tab.id)}
                disabled={!isEnabled}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary text-primary"
                    : isEnabled
                      ? "border-transparent text-muted hover:text-foreground"
                      : "cursor-not-allowed border-transparent text-muted/50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      <div
        className={`mx-auto grid w-full flex-1 gap-4 overflow-y-auto px-4 py-4 lg:grid-cols-[minmax(0,1fr)_300px] ${
          isDrawer ? "max-w-none" : "max-w-[1400px]"
        }`}
      >
        <section className="min-w-0">
          {activeTab === "home" && (
            <CandidateHomeTab
              profile={profile}
              onProfileChange={setProfile}
              onNotesChange={(notes) => setProfile((current) => ({ ...current, notes }))}
              blindHiring={blindHiring}
            />
          )}
          {activeTab === "offers" && (
            <CandidateOffersTab
              profile={profile}
              onProfileChange={setProfile}
              candidateId={profile.id}
              candidateName={displayName}
              candidateEmail={blindHiring ? null : profile.email}
              jobTitle={profile.job.title}
              recruiterName={recruiterName}
              documents={profile.documents}
              emails={profile.emails}
              onDocumentsChange={handleDocumentsChange}
              onEmailSent={handleEmailSent}
            />
          )}
          {activeTab === "interviews" && (
            <InterviewsTab
              candidateId={profile.id}
              candidateName={displayName}
              candidateEmail={blindHiring ? null : profile.email}
              interviews={profile.interviews}
              jobTitle={profile.job.title}
              recruiterName={recruiterName}
              recruiterEmail={recruiterEmail}
              onInterviewScheduled={handleInterviewScheduled}
            />
          )}
          {activeTab === "emails" && (
            <CandidateEmailsTab
              candidateId={profile.id}
              candidateName={displayName}
              candidateEmail={blindHiring ? null : profile.email}
              jobTitle={profile.job.title}
              recruiterName={recruiterName}
              emails={profile.emails}
              onEmailSent={handleEmailSent}
              onInboundSynced={async () => {
                const updated = await api.candidates.profile(profile.id);
                setProfile(updated);
              }}
            />
          )}
          {activeTab === "test-assignments" && (
            <CandidateTestAssignmentsTab
              candidateId={profile.id}
              candidateName={displayName}
              assignments={profile.testAssignments}
              onAssignmentSent={handleTestAssignmentSent}
            />
          )}
          {activeTab === "documents" && (
            <CandidateDocumentsTab
              candidateId={profile.id}
              documents={profile.documents}
              onDocumentsChange={handleDocumentsChange}
            />
          )}
          {activeTab === "history" && <CandidateHistoryTab candidateId={profile.id} />}
          {!ENABLED_TABS.has(activeTab) && (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <p className="text-sm text-muted">
                Розділ «{PROFILE_TABS.find((t) => t.id === activeTab)?.label}» скоро буде доступний.
              </p>
              <Link href="/recruiting" className="mt-3 inline-block text-sm font-medium text-primary">
                Повернутися до воронки
              </Link>
            </div>
          )}
        </section>

        {activeTab !== "home" && (
        <aside className="flex flex-col gap-4">
          <CandidateProfileDetails
            profile={profile}
            onEdit={() => setIsEditOpen(true)}
          />
        </aside>
        )}
      </div>

      <EditCandidateModal
        profile={profile}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={handleProfileSaveSuccess}
      />

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
  );
}
