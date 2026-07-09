"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { formControlClassName } from "@/components/ui/formStyles";

type AssignmentInfo = {
  candidateName: string;
  templateTitle: string;
  expiresAt: string | null;
  submittedAt: string | null;
  expired: boolean;
};

export default function TestAssignmentSubmitPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [info, setInfo] = useState<AssignmentInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submissionLink, setSubmissionLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void params.then((value) => setToken(value.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    void fetch(`/api/public/test-assignments/${token}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Посилання недійсне");
        setInfo(payload);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Посилання недійсне"),
      );
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      if (file) formData.set("file", file);
      if (submissionLink.trim()) formData.set("submissionLink", submissionLink.trim());

      const response = await fetch(`/api/public/test-assignments/${token}`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Не вдалося надіслати завдання");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося надіслати завдання");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Дякуємо!</h1>
        <p className="mt-2 text-sm text-muted">Ваше тестове завдання отримано.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-semibold text-foreground">Надіслати тестове завдання</h1>
      {info && (
        <p className="mt-2 text-sm text-muted">
          {info.candidateName} · {info.templateTitle}
        </p>
      )}

      {info?.expired && (
        <p className="mt-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Термін дії посилання закінчився.
        </p>
      )}

      {info?.submittedAt && (
        <p className="mt-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Завдання вже надіслано.
        </p>
      )}

      {!info?.expired && !info?.submittedAt && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Файл</label>
            <input
              type="file"
              className={formControlClassName}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Або посилання на результат</label>
            <input
              type="url"
              className={formControlClassName}
              value={submissionLink}
              onChange={(event) => setSubmissionLink(event.target.value)}
              placeholder="https://..."
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={isSubmitting || (!file && !submissionLink.trim())}>
            {isSubmitting ? "Надсилання…" : "Надіслати"}
          </Button>
        </form>
      )}
    </main>
  );
}
