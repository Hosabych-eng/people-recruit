"use client";

import { useEffect, useState } from "react";
import type { CandidateLink, CandidateProfile, UpdateCandidateInput } from "@/types";
import { InlineEditableField } from "@/components/candidate/InlineEditableField";
import { Button } from "@/components/ui/Button";
import { formControlClassName } from "@/components/ui/formStyles";
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
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isAddingLink, setIsAddingLink] = useState(false);

  useEffect(() => {
    void api.recruiters
      .list()
      .then((rows) => setRecruiters(rows))
      .catch(() => setRecruiters([]));
  }, []);

  const patchField = async (patch: UpdateCandidateInput) => {
    const updated = await api.candidates.update(profile.id, patch);
    onProfileChange({
      ...profile,
      ...patch,
      // Keep ISO strings for date fields from our patch, not raw Date from API.
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
                    recruiters.find((row) => row.id === patch.recruiterId)?.name ??
                    null,
                  email:
                    recruiters.find((row) => row.id === patch.recruiterId)?.email ??
                    "",
                  image: null,
                }
              : profile.recruiter
            : null
          : profile.recruiter,
      // Preserve nested collections — PATCH does not return full profile.
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
      score: "score" in patch ? (updated.score ?? profile.score) : profile.score,
    });
  };

  const handleAddLink = async () => {
    const label = newLabel.trim();
    const url = newUrl.trim();
    if (!label || !url) {
      setLinkError("Потрібні назва і URL");
      return;
    }

    setIsAddingLink(true);
    setLinkError(null);
    try {
      const created = await api.candidates.links.create(profile.id, { label, url });
      onProfileChange({
        ...profile,
        links: [...profile.links, created],
      });
      setNewLabel("");
      setNewUrl("");
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Не вдалося додати посилання");
    } finally {
      setIsAddingLink(false);
    }
  };

  const handleDeleteLink = async (link: CandidateLink) => {
    if (!window.confirm(`Видалити «${link.label}»?`)) return;
    await api.candidates.links.delete(profile.id, link.id);
    onProfileChange({
      ...profile,
      links: profile.links.filter((row) => row.id !== link.id),
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

      <div className="mt-3 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Посилання
        </p>
        {profile.links.length === 0 ? (
          <p className="text-[11px] text-muted">Поки немає посилань</p>
        ) : (
          <ul className="space-y-1.5">
            {profile.links.map((link) => (
              <li
                key={link.id}
                className="flex items-center justify-between gap-2 rounded border border-border/70 px-2 py-1.5"
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 truncate text-xs font-medium text-primary hover:underline"
                  title={link.url}
                >
                  {link.label}
                </a>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleDeleteLink(link)}
                >
                  ×
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
          <input
            className={`${formControlClassName} py-1 text-xs`}
            placeholder="Назва"
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
          />
          <input
            className={`${formControlClassName} py-1 text-xs`}
            placeholder="https://"
            value={newUrl}
            onChange={(event) => setNewUrl(event.target.value)}
          />
          <Button
            type="button"
            size="sm"
            disabled={isAddingLink}
            onClick={() => void handleAddLink()}
          >
            Додати
          </Button>
        </div>
        {linkError && <p className="text-[10px] text-red-600">{linkError}</p>}
      </div>
    </section>
  );
}
