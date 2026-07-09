"use client";

import { useEffect, useMemo, useState } from "react";
import type { CandidateFieldSchemaItem, CandidateNote, CandidateProfile } from "@/types";
import { CandidateMetadataEditModal } from "@/components/candidate/CandidateMetadataEditModal";
import { CandidateResumeAiSection } from "@/components/candidate/CandidateResumeAiSection";
import { CandidateNotesSidebar } from "@/components/candidate/CandidateNotesSidebar";
import { CandidateAvatar } from "@/components/ui/CandidateAvatar";
import { Button } from "@/components/ui/Button";
import { formLabelClassName } from "@/components/ui/formStyles";
import { getSourceLabel } from "@/lib/application-sources";
import { getStandardFieldDisplayValue } from "@/lib/candidate-fields";
import { candidateHasPdfResume, resolveResumePreviewUrl } from "@/lib/resume-helpers";
import type { ApplicationSource } from "@prisma/client";
import { api } from "@/lib/api/client";

type CandidateHomeTabProps = {
  profile: CandidateProfile;
  onProfileChange: (profile: CandidateProfile) => void;
  onNotesChange: (notes: CandidateNote[]) => void;
  blindHiring?: boolean;
};

const OVERVIEW_KEYS = new Set(["name", "position", "source"]);
const CONTACT_KEYS = new Set(["email", "phone"]);
const QUALIFICATION_KEYS = new Set(["englishLevel", "chineseLevel", "salary"]);

function MessengerIcons({ phone }: { phone: string }) {
  const digits = phone.replace(/\D/g, "");
  return (
    <span className="inline-flex items-center gap-1.5">
      <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" title="WhatsApp" className="text-emerald-600">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.07L2 22l4.93-1.29A9.93 9.93 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/></svg>
      </a>
      <a href={`https://t.me/+${digits}`} target="_blank" rel="noreferrer" title="Telegram" className="text-sky-600">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M9.04 15.29 8.9 18a1 1 0 0 0 1.24 1.02l2.8-.84 6.56 4.84a1 1 0 0 0 1.55-.82l4-17.5A1 1 0 0 0 21.3 3.7L2.77 11.15a1 1 0 0 0 .02 1.88l4.9 1.84 11.35-7.15-9.6 8.41z"/></svg>
      </a>
      <a href={`viber://chat?number=%2B${digits}`} title="Viber" className="text-violet-600">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 2C7.03 2 3 5.58 3 10.01c0 2.07.9 3.94 2.34 5.33L4 22l6.77-1.28A10.8 10.8 0 0 0 12 22c4.97 0 9-3.58 9-8.01C21 5.58 16.97 2 12 2z"/></svg>
      </a>
    </span>
  );
}

function MetaBlock({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-2.5 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 border-b border-border/40 py-1.5 text-xs last:border-0">
      <span className="w-24 shrink-0 font-medium text-muted">{label}</span>
      <span className="min-w-0 flex-1 text-foreground">{value}</span>
    </div>
  );
}

export function CandidateHomeTab({
  profile,
  onProfileChange,
  onNotesChange,
  blindHiring = false,
}: CandidateHomeTabProps) {
  const [score, setScore] = useState(profile.score ?? 0);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [fieldSchema, setFieldSchema] = useState<CandidateFieldSchemaItem[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const resumeDoc = useMemo(
    () => profile.documents.find((d) => d.category === "RESUME"),
    [profile.documents],
  );

  const resumeViewerUrl = resolveResumePreviewUrl(profile, resumeDoc);
  const hasPdfResume = candidateHasPdfResume({
    documents: profile.documents,
    resumeLink: profile.resumeLink,
  });
  const showResumeSection = Boolean(resumeViewerUrl || hasPdfResume);

  useEffect(() => {
    void fetch("/api/candidate-fields")
      .then((r) => r.json())
      .then((fields) => setFieldSchema(fields))
      .catch(() => setFieldSchema([]));
  }, []);

  const overviewFields = fieldSchema.filter((f) => OVERVIEW_KEYS.has(f.fieldKey));
  const contactFields = fieldSchema.filter((f) => CONTACT_KEYS.has(f.fieldKey));
  const qualificationFields = fieldSchema.filter(
    (f) => QUALIFICATION_KEYS.has(f.fieldKey) || f.isCustom,
  );

  const handleScoreSave = async () => {
    setIsSavingScore(true);
    try {
      const updated = await api.candidates.update(profile.id, { score });
      onProfileChange({ ...profile, score: updated.score ?? score });
    } finally {
      setIsSavingScore(false);
    }
  };

  const renderFieldValue = (field: CandidateFieldSchemaItem) => {
    if (blindHiring && (field.fieldKey === "email" || field.fieldKey === "phone")) {
      return "—";
    }
    if (field.isCustom) {
      return profile.customFields[field.fieldKey] || "—";
    }
    if (field.fieldKey === "phone" && profile.phone) {
      return (
        <span className="inline-flex flex-wrap items-center gap-2">
          {profile.phone}
          <MessengerIcons phone={profile.phone} />
        </span>
      );
    }
    return getStandardFieldDisplayValue(profile, field.fieldKey);
  };

  const activeApplication =
    profile.applications.find((row) => row.job.id === profile.job.id) ??
    profile.applications[0];

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
      <div className="space-y-2.5">
        <MetaBlock
          title="Огляд"
          action={
            <Button type="button" size="sm" variant="outline" onClick={() => setIsEditOpen(true)}>
              Редагувати
            </Button>
          }
        >
          <div className="mb-2 flex items-center gap-2">
            <CandidateAvatar
              name={profile.name}
              avatarUrl={blindHiring ? null : profile.avatarUrl}
              seed={profile.id}
              size="sm"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {blindHiring ? `Candidate ${profile.id.slice(0, 6)}` : profile.name}
              </p>
              <p className="text-[11px] text-muted">{profile.position ?? profile.job.title}</p>
            </div>
          </div>
          {overviewFields.map((field) => (
            <MetaRow key={field.id} label={field.label} value={renderFieldValue(field)} />
          ))}
          <div className="flex items-center justify-between border-b border-border/40 py-1.5 text-xs last:border-0">
            <span className="w-24 shrink-0 font-medium text-muted">Оцінка</span>
            <div className="flex flex-1 flex-wrap items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScore(value)}
                  className={`h-6 w-6 rounded text-[11px] font-semibold ${
                    score >= value ? "bg-amber-400 text-white" : "bg-slate-100 text-muted"
                  }`}
                >
                  {value}
                </button>
              ))}
              <Button
                type="button"
                size="sm"
                disabled={isSavingScore}
                onClick={() => void handleScoreSave()}
              >
                Зберегти
              </Button>
              <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                {score}/5
              </span>
            </div>
          </div>
        </MetaBlock>

        <MetaBlock title="Контакти">
          {contactFields.length > 0 ? (
            contactFields.map((field) => (
              <MetaRow key={field.id} label={field.label} value={renderFieldValue(field)} />
            ))
          ) : (
            <MetaRow label="Email" value={profile.email ?? "—"} />
          )}
          {!contactFields.some((f) => f.fieldKey === "phone") && profile.phone && (
            <MetaRow
              label="Телефон"
              value={
                <span className="inline-flex flex-wrap items-center gap-2">
                  {profile.phone}
                  <MessengerIcons phone={profile.phone} />
                </span>
              }
            />
          )}
        </MetaBlock>

        <MetaBlock title="Кваліфікація та поля">
          {qualificationFields.length > 0 ? (
            qualificationFields.map((field) => (
              <MetaRow key={field.id} label={field.label} value={renderFieldValue(field)} />
            ))
          ) : (
            <>
              <MetaRow label="Англійська" value={profile.englishLevel ?? "—"} />
              <MetaRow label="Китайська" value={profile.chineseLevel ?? "—"} />
              <MetaRow
                label="Зарплата"
                value={
                  profile.expectedSalary != null
                    ? `${profile.expectedSalary} ${profile.salaryCurrency ?? "USD"}`
                    : "—"
                }
              />
            </>
          )}
        </MetaBlock>

        {profile.coverLetter && (
          <section className="rounded-lg border border-border bg-card p-2.5 text-xs">
            <h3 className="mb-1 font-semibold">Супровідний лист</h3>
            <p className="whitespace-pre-wrap text-muted">{profile.coverLetter}</p>
          </section>
        )}

        {(resumeDoc || profile.resumeLink || hasPdfResume) && showResumeSection && (
          <CandidateResumeAiSection
            candidateId={profile.id}
            resumeViewerUrl={resumeViewerUrl}
            hasPdfResume={hasPdfResume}
          />
        )}
      </div>

      <div className="space-y-2.5">
        <section className="rounded-lg border border-border bg-card p-2.5 shadow-sm">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Активна вакансія
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-foreground">
              {activeApplication?.job.title ?? profile.job.title}
            </span>
            <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              {activeApplication?.stage.name ?? profile.stage.name}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Джерело: {getSourceLabel(profile.applicationSource as ApplicationSource)}
          </p>
          <p className="text-[11px] text-muted">
            Керування етапами — у вкладці «Пропозиції».
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card p-2.5">
          <label className={formLabelClassName}>Коментарі рекрутера</label>
          <CandidateNotesSidebar
            candidateId={profile.id}
            initialNotes={profile.notes}
            onNotesChange={onNotesChange}
          />
        </section>
      </div>

      <CandidateMetadataEditModal
        profile={profile}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={onProfileChange}
      />
    </div>
  );
}
