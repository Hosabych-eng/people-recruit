"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CandidateProfile } from "@/types";
import { CandidateEmailsTab } from "@/components/candidate/CandidateEmailsTab";
import { CandidateDocumentsTab } from "@/components/candidate/CandidateDocumentsTab";
import { CandidateTestAssignmentsTab } from "@/components/candidate/CandidateTestAssignmentsTab";
import { CandidateNotesSidebar } from "@/components/candidate/CandidateNotesSidebar";
import { InterviewsTab } from "@/components/candidate/InterviewsTab";
import { useAuth } from "@/components/auth/AuthProvider";
import { getInitials } from "@/lib/avatar-colors";
import { PROFILE_TABS, type CandidateProfileTab } from "@/lib/candidate-profile";
import { CandidateProfileDetails } from "@/components/candidate/CandidateProfileDetails";
import { EditCandidateModal } from "@/components/candidate/EditCandidateModal";
import { Toast } from "@/components/ui/Toast";
import { getSourceLabel } from "@/lib/application-sources";
import { api } from "@/lib/api/client";
import type { ApplicationSource } from "@prisma/client";

type CandidateProfileViewProps = {
  profile: CandidateProfile;
};

const ENABLED_TABS = new Set<CandidateProfileTab>([
  "interviews",
  "emails",
  "test-assignments",
  "documents",
]);

function formatAddedDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function CandidateProfileView({ profile: initialProfile }: CandidateProfileViewProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState(initialProfile);
  const [activeTab, setActiveTab] = useState<CandidateProfileTab>("interviews");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="border-b border-border bg-card px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-lg font-semibold text-white">
              {getInitials(profile.name)}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {profile.name}
              </h1>
              <p className="mt-1 text-sm text-muted">
                Додано {formatAddedDate(profile.createdAt)},{" "}
                {getSourceLabel(profile.applicationSource as ApplicationSource)}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Попередній кандидат"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:bg-slate-50"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Наступний кандидат"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:bg-slate-50"
            >
              ›
            </button>
            <button
              type="button"
              aria-label="Меню"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:bg-slate-50"
            >
              ···
            </button>
            <button
              type="button"
              onClick={() => router.push("/recruiting")}
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

      <div className="mx-auto grid w-full max-w-[1400px] flex-1 gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0">
          {activeTab === "interviews" && (
            <InterviewsTab
              candidateId={profile.id}
              candidateName={profile.name}
              candidateEmail={profile.email}
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
              candidateName={profile.name}
              candidateEmail={profile.email}
              jobTitle={profile.job.title}
              recruiterName={recruiterName}
              emails={profile.emails}
              onEmailSent={handleEmailSent}
            />
          )}
          {activeTab === "test-assignments" && (
            <CandidateTestAssignmentsTab
              candidateId={profile.id}
              candidateName={profile.name}
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

        <aside className="flex flex-col gap-6">
          <CandidateProfileDetails
            profile={profile}
            onEdit={() => setIsEditOpen(true)}
          />
          <CandidateNotesSidebar
            candidateId={profile.id}
            initialNotes={profile.notes}
          />
        </aside>
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
