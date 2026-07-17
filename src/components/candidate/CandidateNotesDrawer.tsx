"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Candidate } from "@prisma/client";
import type { CandidateNote, JobWithPipeline } from "@/types";
import { NoteRichTextEditor } from "@/components/candidate/NoteRichTextEditor";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api/client";
import { isProbablyHtml, noteHtmlIsEmpty, sanitizeNoteHtml } from "@/lib/note-html";
import { findCandidateInPipeline } from "@/lib/pipeline-utils";

type CandidateNotesDrawerProps = {
  pipeline: JobWithPipeline;
  candidateId: string | null;
  onClose: () => void;
  onNoteAdded: (candidateId: string) => void;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getStageName(pipeline: JobWithPipeline, candidate: Candidate) {
  for (const stage of pipeline.stages) {
    if (stage.candidates.some((item) => item.id === candidate.id)) {
      return stage.name;
    }
  }
  return "Unknown";
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function AuthorAvatar({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl: string | null;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {getInitials(name)}
    </div>
  );
}

function NoteBody({ content }: { content: string }) {
  if (isProbablyHtml(content)) {
    return (
      <div
        className="mt-2 text-sm leading-relaxed text-foreground [&_a]:text-primary [&_a]:underline [&_img]:mt-2 [&_img]:max-h-48 [&_img]:rounded-md [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(content) }}
      />
    );
  }

  return (
    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
      {content}
    </p>
  );
}

export function CandidateNotesDrawer({
  pipeline,
  candidateId,
  onClose,
  onNoteAdded,
}: CandidateNotesDrawerProps) {
  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const candidate = candidateId
    ? findCandidateInPipeline(pipeline, candidateId)
    : null;

  const loadNotes = useCallback(async () => {
    if (!candidateId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.candidates.notes.list(candidateId);
      setNotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setIsLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    if (!candidateId) {
      setIsVisible(false);
      return;
    }

    setContent("");
    setError(null);
    loadNotes();

    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [candidateId, loadNotes]);

  useEffect(() => {
    if (!feedRef.current || notes.length === 0) return;
    feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [notes]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  if (!candidateId || !candidate) return null;

  const stageName = getStageName(pipeline, candidate);

  const handleClose = () => {
    setIsVisible(false);
    closeTimerRef.current = window.setTimeout(onClose, 300);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (noteHtmlIsEmpty(content)) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const note = await api.candidates.notes.create(candidateId, {
        content,
      });
      setNotes((current) => [...current, note]);
      setContent("");
      onNoteAdded(candidateId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close notes panel"
        onClick={handleClose}
        className={`fixed inset-0 z-40 bg-slate-900/20 transition-opacity duration-300 ease-out ${
          isVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidate-notes-drawer-title"
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl transition-transform duration-300 ease-out ${
          isVisible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Candidate notes
            </p>
            <h2
              id="candidate-notes-drawer-title"
              className="truncate text-lg font-semibold text-foreground"
            >
              {candidate.name}
            </h2>
            <p className="mt-1 truncate text-sm text-muted">{candidate.email}</p>
            <p className="mt-2 inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {stageName}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Close
          </Button>
        </div>

        <div
          ref={feedRef}
          className="flex-1 space-y-4 overflow-y-auto px-6 py-5"
        >
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-7 w-7" />
            </div>
          ) : notes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No notes yet</p>
              <p className="mt-1 text-sm text-muted">
                Start the thread with interview feedback or follow-up reminders.
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <article
                key={note.id}
                className="rounded-xl border border-border bg-background p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <AuthorAvatar
                    name={note.authorName}
                    photoUrl={note.authorPhotoUrl}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {note.authorName}
                      </p>
                      <time
                        dateTime={note.createdAt}
                        className="text-xs text-muted"
                      >
                        {formatTimestamp(note.createdAt)}
                      </time>
                    </div>
                    <NoteBody content={note.content} />
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-border bg-card px-6 py-4"
        >
          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Add note</span>
            <NoteRichTextEditor
              candidateId={candidateId}
              value={content}
              onChange={setContent}
              disabled={isSubmitting}
              placeholder="Share interview feedback, next steps, or context for the team…"
              onUploadError={setError}
            />
          </div>

          <div className="mt-3 flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || noteHtmlIsEmpty(content)}
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Posting…
                </>
              ) : (
                "Post note"
              )}
            </Button>
          </div>
        </form>
      </aside>
    </>
  );
}
