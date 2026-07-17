"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { CandidateNote } from "@/types";
import { NoteRichTextEditor } from "@/components/candidate/NoteRichTextEditor";
import { Spinner } from "@/components/ui/Spinner";
import { getAvatarColors, getInitials } from "@/lib/avatar-colors";
import { formatRelativeTimeUk } from "@/lib/format-relative-time";
import { isProbablyHtml, noteHtmlIsEmpty, sanitizeNoteHtml } from "@/lib/note-html";
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

function NoteBody({ content }: { content: string }) {
  if (isProbablyHtml(content)) {
    return (
      <div
        className="note-html mt-2 text-sm leading-relaxed text-foreground/90 [&_a]:text-primary [&_a]:underline [&_img]:mt-2 [&_img]:max-h-48 [&_img]:rounded-md [&_img]:border [&_img]:border-border [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(content) }}
      />
    );
  }

  return (
    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
      {content}
    </p>
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

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (noteHtmlIsEmpty(content)) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const note = await api.candidates.notes.create(candidateId, { content });
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
        <div className="space-y-2">
          <NoteRichTextEditor
            candidateId={candidateId}
            value={content}
            onChange={setContent}
            disabled={isSubmitting}
            onUploadError={setError}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || noteHtmlIsEmpty(content)}
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
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
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
                  <NoteBody content={note.content} />
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </aside>
  );
}
