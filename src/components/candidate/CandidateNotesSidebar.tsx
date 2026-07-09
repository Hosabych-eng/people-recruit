"use client";

import { useState, type FormEvent } from "react";
import type { CandidateNote } from "@/types";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName } from "@/components/ui/formStyles";
import { getAvatarColors, getInitials } from "@/lib/avatar-colors";
import { formatRelativeTimeUk } from "@/lib/format-relative-time";
import { api } from "@/lib/api/client";

type CandidateNotesSidebarProps = {
  candidateId: string;
  initialNotes: CandidateNote[];
  onNotesChange?: (notes: CandidateNote[]) => void;
};

function NoteAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }

  const colors = getAvatarColors(name);
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}
    >
      {getInitials(name)}
    </div>
  );
}

export function CandidateNotesSidebar({
  candidateId,
  initialNotes,
  onNotesChange,
}: CandidateNotesSidebarProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const note = await api.candidates.notes.create(candidateId, { content: trimmed });
      setNotes((current) => {
        const next = [note, ...current];
        onNotesChange?.(next);
        return next;
      });
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося додати примітку");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!window.confirm("Видалити цю примітку?")) return;

    try {
      await api.candidates.notes.delete(candidateId, noteId);
      setNotes((current) => {
        const next = current.filter((note) => note.id !== noteId);
        onNotesChange?.(next);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося видалити примітку");
    }
  };

  return (
    <aside className="flex h-full min-h-[32rem] flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold text-foreground">Примітки</h2>
      </div>

      <form onSubmit={handleSubmit} className="border-b border-border px-5 py-4">
        <div className="rounded-lg border border-border bg-background">
          <div className="flex items-center gap-1 border-b border-border px-2 py-1.5 text-muted">
            <ToolbarButton label="Жирний">B</ToolbarButton>
            <ToolbarButton label="Курсив">I</ToolbarButton>
            <ToolbarButton label="Підкреслений">U</ToolbarButton>
          </div>
          <textarea
            rows={4}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Натисніть тут, щоб додати примітку..."
            className={`${formControlClassName} resize-none border-0 bg-transparent shadow-none focus:ring-0`}
          />
          <div className="flex justify-end border-t border-border px-3 py-2">
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Надсилання…
                </span>
              ) : (
                "Коментар"
              )}
            </button>
          </div>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </form>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {notes.length === 0 ? (
          <p className="text-center text-sm text-muted">Ще немає приміток.</p>
        ) : (
          notes.map((note) => (
            <article key={note.id} className="group">
              <div className="flex items-start gap-3">
                <NoteAvatar name={note.authorName} photoUrl={note.authorPhotoUrl} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {note.authorName}
                      </p>
                      {note.authorRole && (
                        <p className="text-xs text-muted">{note.authorRole}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <time className="text-xs text-muted" dateTime={note.createdAt}>
                        {formatRelativeTimeUk(note.createdAt)}
                      </time>
                      <button
                        type="button"
                        onClick={() => void handleDelete(note.id)}
                        className="rounded px-1 text-xs text-muted opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                      >
                        Видалити
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {note.content}
                  </p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </aside>
  );
}

function ToolbarButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded text-xs font-semibold hover:bg-slate-100"
    >
      {children}
    </button>
  );
}
