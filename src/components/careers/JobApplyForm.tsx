"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type LanguageLevel = { id: string; language: string; label: string };

type JobApplyFormProps = {
  jobId: string;
  jobTitle: string;
};

const CURRENCIES = ["USD", "EUR", "UAH", "PLN"];

export function JobApplyForm({ jobId, jobTitle }: JobApplyFormProps) {
  const router = useRouter();

  const [englishLevels, setEnglishLevels] = useState<LanguageLevel[]>([]);
  const [chineseLevels, setChineseLevels] = useState<LanguageLevel[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    expectedSalary: "",
    salaryCurrency: "USD",
    englishLevel: "",
    chineseLevel: "",
    coverLetter: "",
  });
  const [resume, setResume] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void fetch("/api/careers/options")
      .then((r) => r.json())
      .then((data) => {
        setEnglishLevels(data.englishLevels ?? []);
        setChineseLevels(data.chineseLevels ?? []);
      });
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("jobId", jobId);
      formData.set("name", form.name.trim());
      formData.set("email", form.email.trim());
      formData.set("phone", form.phone.trim());
      formData.set("salaryCurrency", form.salaryCurrency);
      if (form.expectedSalary.trim()) formData.set("expectedSalary", form.expectedSalary.trim());
      if (form.englishLevel) formData.set("englishLevel", form.englishLevel);
      if (form.chineseLevel) formData.set("chineseLevel", form.chineseLevel);
      if (form.coverLetter.trim()) formData.set("coverLetter", form.coverLetter.trim());
      if (resume) formData.set("resume", resume);

      const response = await fetch("/api/careers/apply", {
        method: "POST",
        body: formData,
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
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-career-accent">Вакансія</p>
      <h1 className="mt-1 text-xl font-bold text-foreground">{jobTitle}</h1>
      <p className="mt-2 text-sm text-muted">Заповніть форму — ми розглянемо вашу кандидатуру.</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-3 sm:grid-cols-2">
        <Field label="Повне ім'я" required className="sm:col-span-2">
          <input required value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} className={inputClass} />
        </Field>
        <Field label="Email" required>
          <input type="email" required value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} className={inputClass} />
        </Field>
        <Field label="Телефон" required>
          <input required value={form.phone} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} className={inputClass} />
        </Field>
        <Field label="Очікувана зарплата">
          <div className="flex gap-2">
            <input type="number" min="0" value={form.expectedSalary} onChange={(e) => setForm((c) => ({ ...c, expectedSalary: e.target.value }))} className={inputClass} />
            <select value={form.salaryCurrency} onChange={(e) => setForm((c) => ({ ...c, salaryCurrency: e.target.value }))} className={inputClass}>
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          </div>
        </Field>
        <Field label="Рівень англійської">
          <select value={form.englishLevel} onChange={(e) => setForm((c) => ({ ...c, englishLevel: e.target.value }))} className={inputClass}>
            <option value="">Оберіть рівень</option>
            {englishLevels.map((level) => (
              <option key={level.id} value={level.label}>{level.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Рівень китайської">
          <select value={form.chineseLevel} onChange={(e) => setForm((c) => ({ ...c, chineseLevel: e.target.value }))} className={inputClass}>
            <option value="">Оберіть рівень</option>
            {chineseLevels.map((level) => (
              <option key={level.id} value={level.label}>{level.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Супровідний лист" className="sm:col-span-2">
          <textarea rows={4} value={form.coverLetter} onChange={(e) => setForm((c) => ({ ...c, coverLetter: e.target.value }))} className={inputClass} />
        </Field>
        <Field label="Резюме (PDF)" className="sm:col-span-2">
          <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setResume(e.target.files?.[0] ?? null)} className={inputClass} />
        </Field>

        {error && (
          <p className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="submit" disabled={isSubmitting} className="inline-flex h-10 items-center rounded-xl bg-career-accent-strong px-5 text-sm font-semibold text-white disabled:opacity-60">
            {isSubmitting ? "Надсилання…" : "Надіслати заявку"}
          </button>
          <Link href={`/careers/${jobId}`} className="inline-flex h-10 items-center rounded-xl border border-border px-5 text-sm font-semibold">
            Скасувати
          </Link>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-career-accent focus:ring-2 focus:ring-career-accent/20";

function Field({
  label,
  children,
  required = false,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-foreground">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
