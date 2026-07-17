"use client";

import type { CandidateProfile } from "@/types";
import { Button } from "@/components/ui/Button";

type CandidateProfileDetailsProps = {
  profile: CandidateProfile;
  onEdit: () => void;
};

function DetailRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null;
  href?: string;
}) {
  const displayValue = value?.trim() || "—";

  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-sm text-foreground">
        {href && value ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-medium text-primary hover:underline"
          >
            {displayValue}
          </a>
        ) : (
          <span className="break-all">{displayValue}</span>
        )}
      </dd>
    </div>
  );
}

export function CandidateProfileDetails({
  profile,
  onEdit,
}: CandidateProfileDetailsProps) {
  return (
    <aside className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold text-foreground">Профіль</h2>
        <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={onEdit}>
          Вакансія / етап
        </Button>
      </div>

      <dl className="space-y-4 px-5 py-4">
        <DetailRow label="Email" value={profile.email} href={`mailto:${profile.email}`} />
        <DetailRow label="Телефон" value={profile.phone} href={profile.phone ? `tel:${profile.phone}` : undefined} />
        <DetailRow
          label="Резюме"
          value={profile.resumeLink}
          href={profile.resumeLink ?? undefined}
        />
        <DetailRow label="Вакансія" value={profile.job.title} />
        <DetailRow label="Статус" value={profile.stage.name} />
      </dl>
    </aside>
  );
}
