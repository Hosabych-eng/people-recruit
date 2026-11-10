"use client";

import { useState } from "react";
import type { CandidateLink, CandidateProfile } from "@/types";
import { Button } from "@/components/ui/Button";
import { formControlClassName } from "@/components/ui/formStyles";
import { api } from "@/lib/api/client";

type CandidateLinksSectionProps = {
  profile: CandidateProfile;
  onProfileChange: (profile: CandidateProfile) => void;
};

export function CandidateLinksSection({
  profile,
  onProfileChange,
}: CandidateLinksSectionProps) {
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isAddingLink, setIsAddingLink] = useState(false);

  const links = profile.links ?? [];

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
      const created = await api.candidates.links.create(profile.id, {
        label,
        url,
      });
      onProfileChange({
        ...profile,
        links: [...links, created],
      });
      setNewLabel("");
      setNewUrl("");
    } catch (err) {
      setLinkError(
        err instanceof Error ? err.message : "Не вдалося додати посилання",
      );
    } finally {
      setIsAddingLink(false);
    }
  };

  const handleDeleteLink = async (link: CandidateLink) => {
    if (!window.confirm(`Видалити «${link.label}»?`)) return;
    await api.candidates.links.delete(profile.id, link.id);
    onProfileChange({
      ...profile,
      links: links.filter((row) => row.id !== link.id),
    });
  };

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        Посилання
      </p>
      {links.length === 0 ? (
        <p className="text-[11px] text-muted">Поки немає посилань</p>
      ) : (
        <ul className="space-y-1.5">
          {links.map((link) => (
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
  );
}
