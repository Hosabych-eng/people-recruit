"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { getAvatarColors, getInitials } from "@/lib/avatar-colors";

type HistoryAuthor = {
  id: string | null;
  name: string;
  email: string | null;
  photoUrl: string | null;
};

type HistoryEntry = {
  id: string;
  type: string;
  title: string;
  detail?: string | null;
  occurredAt: string;
  author: HistoryAuthor;
};

type CandidateHistoryTabProps = {
  candidateId: string;
};

const TYPE_LABELS: Record<string, string> = {
  note: "Коментар",
  email: "Лист",
  interview: "Інтерв'ю",
  application: "Заявка",
  "test-assignment": "Тест",
  workforce: "Подія",
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function AuthorBadge({ author }: { author: HistoryAuthor }) {
  const colors = getAvatarColors(author.name || author.email || "user");

  return (
    <div className="flex min-w-0 items-center gap-2">
      {author.photoUrl ? (
        <img
          src={author.photoUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full border border-border object-cover"
        />
      ) : (
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${colors.bg} ${colors.text}`}
        >
          {getInitials(author.name || author.email || "?")}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{author.name}</p>
        {author.email && (
          <p className="truncate text-xs text-muted">{author.email}</p>
        )}
      </div>
    </div>
  );
}

export function CandidateHistoryTab({ candidateId }: CandidateHistoryTabProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    void fetch(`/api/candidates/${candidateId}/history`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Не вдалося завантажити історію");
        }
        setEntries(payload);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Не вдалося завантажити історію"),
      )
      .finally(() => setIsLoading(false));
  }, [candidateId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-10 text-sm text-muted">
        <Spinner className="h-4 w-4" />
        Завантаження історії…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
        <p className="text-sm text-muted">Історія активності поки порожня.</p>
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                {TYPE_LABELS[entry.type] ?? entry.type}
              </span>
              <h3 className="text-sm font-semibold text-foreground">{entry.title}</h3>
              <AuthorBadge
                author={
                  entry.author ?? {
                    id: null,
                    name: "Система",
                    email: null,
                    photoUrl: null,
                  }
                }
              />
            </div>
            <time className="shrink-0 text-xs text-muted">
              {formatTimestamp(entry.occurredAt)}
            </time>
          </div>
          {entry.detail && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/80">{entry.detail}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
