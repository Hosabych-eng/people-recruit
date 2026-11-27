"use client";

import { useEffect, useState } from "react";
import type { CandidateProfile, UpdateCandidateInput } from "@/types";
import { CandidateLinksSection } from "@/components/candidate/CandidateLinksSection";
import { InlineEditableField } from "@/components/candidate/InlineEditableField";
import { formControlClassName } from "@/components/ui/formStyles";
import { updateCandidatePartial } from "@/lib/candidates/actions";
import { api } from "@/lib/api/client";

type CandidateAdditionalInfoProps = {
  profile: CandidateProfile;
  onProfileChange: (profile: CandidateProfile) => void;
  blindHiring?: boolean;
};

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function CandidateAdditionalInfo({
  profile,
  onProfileChange,
  blindHiring = false,
}: CandidateAdditionalInfoProps) {
  const [recruiters, setRecruiters] = useState<
    Array<{ id: string; name: string | null; email: string }>
  >([]);

  useEffect(() => {
    void api.recruiters
      .list()
      .then((rows) => setRecruiters(rows))
      .catch(() => setRecruiters([]));
  }, []);

  const patchField = async (patch: UpdateCandidateInput) => {
    const result = await updateCandidatePartial(profile.id, patch);
    if (!result.ok) {
      throw new Error(result.error);
    }

    onProfileChange({
      ...profile,
      ...patch,
      location:
        "location" in patch ? (patch.location ?? null) : profile.location,
      telegram:
        "telegram" in patch ? (patch.telegram ?? null) : profile.telegram,
      offerLink:
        "offerLink" in patch ? (patch.offerLink ?? null) : profile.offerLink,
      firstContactDate:
        "firstContactDate" in patch
          ? (patch.firstContactDate ?? null)
          : profile.firstContactDate,
      lastContactDate:
        "lastContactDate" in patch
          ? (patch.lastContactDate ?? null)
          : profile.lastContactDate,
      recruiterId:
        "recruiterId" in patch ? (patch.recruiterId ?? null) : profile.recruiterId,
      recruiter:
        "recruiterId" in patch
          ? patch.recruiterId
            ? recruiters.find((row) => row.id === patch.recruiterId)
              ? {
                  id: patch.recruiterId,
                  name:
                    recruiters.find((row) => row.id === patch.recruiterId)
                      ?.name ?? null,
                  email:
                    recruiters.find((row) => row.id === patch.recruiterId)
                      ?.email ?? "",
                  image: null,
                }
              : profile.recruiter
            : null
          : profile.recruiter,
      applications: profile.applications,
      notes: profile.notes,
      interviews: profile.interviews,
      emails: profile.emails,
      testAssignments: profile.testAssignments,
      documents: profile.documents,
      customFields: profile.customFields,
      links: profile.links,
      tags: profile.tags,
      stage: profile.stage,
      job: profile.job,
    });
  };

  return (
    <section className="rounded-lg border border-border bg-card p-2.5 shadow-sm">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Додаткова інформація
      </h3>

      <InlineEditableField
        label="Локація"
        value={profile.location ?? ""}
        onSave={(next) => patchField({ location: next || null })}
      />
      <InlineEditableField
        label="Telegram"
        value={blindHiring ? "" : (profile.telegram ?? "")}
        disabled={blindHiring}
        placeholder="@username"
        onSave={(next) => patchField({ telegram: next || null })}
      />
      <InlineEditableField
        label="Offer link"
        value={profile.offerLink ?? ""}
        type="url"
        placeholder="https://"
        onSave={(next) => patchField({ offerLink: next || null })}
      />
      <InlineEditableField
        label="Перший контакт"
        value={toDateInputValue(profile.firstContactDate)}
        type="date"
        onSave={(next) =>
          patchField({
            firstContactDate: next ? new Date(next).toISOString() : null,
          })
        }
      />
      <InlineEditableField
        label="Останній контакт"
        value={toDateInputValue(profile.lastContactDate)}
        type="date"
        onSave={(next) =>
          patchField({
            lastContactDate: next ? new Date(next).toISOString() : null,
          })
        }
      />

      <div className="flex gap-2 border-b border-border/40 py-1.5 text-xs last:border-0">
        <span className="w-28 shrink-0 font-medium text-muted">Рекрутер</span>
        <select
          className={`${formControlClassName} py-1 text-xs`}
          value={profile.recruiterId ?? ""}
          onChange={(event) => {
            const recruiterId = event.target.value || null;
            void patchField({ recruiterId });
          }}
        >
          <option value="">Не призначено</option>
          {recruiters.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name?.trim() || row.email}
            </option>
          ))}
        </select>
      </div>

      <CandidateLinksSection
        profile={profile}
        onProfileChange={onProfileChange}
      />
    </section>
  );
}
