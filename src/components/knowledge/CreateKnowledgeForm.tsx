"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";
import { api } from "@/lib/api/client";

type CreateKnowledgeFormProps = {
  onCreated: () => void;
};

export function CreateKnowledgeForm({ onCreated }: CreateKnowledgeFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await api.knowledge.create({
        title: title.trim(),
        content: content.trim(),
      });

      setTitle("");
      setContent("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create article");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-semibold text-foreground">Create new entry</h2>
      <p className="mt-1 text-sm text-muted">
        Share policies, guides, and internal notes with the team.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block space-y-2">
          <span className={formLabelClassName}>Title</span>
          <input
            type="text"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={formControlClassName}
            placeholder="Onboarding checklist"
          />
        </label>

        <label className="block space-y-2">
          <span className={formLabelClassName}>Content</span>
          <textarea
            required
            rows={8}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className={`${formControlClassName} min-h-[160px] resize-y`}
            placeholder="Write the article content here…"
          />
        </label>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Publishing…
            </>
          ) : (
            "Publish entry"
          )}
        </Button>
      </form>
    </section>
  );
}
