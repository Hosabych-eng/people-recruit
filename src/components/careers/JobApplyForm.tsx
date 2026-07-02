"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type JobApplyFormProps = {
  jobId: string;
};

export function JobApplyForm({ jobId }: JobApplyFormProps) {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    resumeLink: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/public/jobs/${jobId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          resumeLink: form.resumeLink.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Не вдалося надіслати заявку");
      }

      router.push(`/careers/${jobId}?applied=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося надіслати заявку");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground">Відгукнутися</h1>
      <p className="mt-2 text-sm text-muted">
        Заповніть форму нижче. Ми зв&apos;яжемося з вами найближчим часом.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Field
          label="Ім'я"
          value={form.name}
          onChange={(value) => setForm((current) => ({ ...current, name: value }))}
          required
        />
        <Field
          label="Email"
          type="email"
          value={form.email}
          onChange={(value) => setForm((current) => ({ ...current, email: value }))}
          required
        />
        <Field
          label="Телефон"
          value={form.phone}
          onChange={(value) => setForm((current) => ({ ...current, phone: value }))}
        />
        <Field
          label="Посилання на резюме"
          value={form.resumeLink}
          onChange={(value) =>
            setForm((current) => ({ ...current, resumeLink: value }))
          }
        />

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-career-accent-strong px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? "Надсилання…" : "Надіслати заявку"}
          </button>
          <Link
            href={`/careers/${jobId}`}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-semibold text-foreground"
          >
            Скасувати
          </Link>
        </div>
      </form>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none transition-colors focus:border-career-accent focus:ring-2 focus:ring-career-accent/20"
      />
    </label>
  );
}
