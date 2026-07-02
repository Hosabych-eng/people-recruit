"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { UserRole } from "@/lib/auth-session";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formControlClassName, formLabelClassName } from "@/components/ui/formStyles";

export type TeamUser = {
  id: string;
  email: string | null;
  name: string | null;
  role: UserRole;
  status: "ACTIVE" | "PENDING";
  image: string | null;
  createdAt: string;
};

export type TeamInvitation = {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  createdAt: string;
  expiresAt: string;
};

type UserFormModalProps = {
  mode: "create" | "edit";
  user?: TeamUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  name: string;
  email: string;
  role: UserRole;
};

const emptyForm: FormState = {
  name: "",
  email: "",
  role: "RECRUITER",
};

export function UserFormModal({
  mode,
  user,
  isOpen,
  onClose,
  onSaved,
}: UserFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (mode === "edit" && user) {
      setForm({
        name: user.name ?? "",
        email: user.email ?? "",
        role: user.role,
      });
    } else {
      setForm(emptyForm);
    }

    setError(null);
    setIsSubmitting(false);
  }, [isOpen, mode, user]);

  if (!isOpen) return null;

  const isCreate = mode === "create";
  const title = isCreate ? "Запросити користувача" : "Редагувати користувача";
  const subtitle = isCreate
    ? "Надішліть запрошення на Google-акаунт. Користувач зможе увійти після прийняття інвайту."
    : `Оновіть роль для ${user?.name ?? user?.email ?? "користувача"}.`;

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        isCreate ? "/api/users" : `/api/users/${user?.id}`,
        {
          method: isCreate ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isCreate
              ? { email: form.email.trim(), role: form.role }
              : { name: form.name.trim(), role: form.role },
          ),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Не вдалося зберегти");
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося зберегти");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Закрити"
        className="absolute inset-0 bg-slate-900/20"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-form-title"
        className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Доступ команди
          </p>
          <h2 id="user-form-title" className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          {isCreate ? (
            <label className="block space-y-2">
              <span className={formLabelClassName}>Email</span>
              <input
                required
                type="email"
                autoFocus
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                className={formControlClassName}
                placeholder="recruiter@company.com"
              />
            </label>
          ) : (
            <label className="block space-y-2">
              <span className={formLabelClassName}>Ім&apos;я</span>
              <input
                required
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                className={formControlClassName}
              />
            </label>
          )}

          <label className="block space-y-2">
            <span className={formLabelClassName}>Роль</span>
            <select
              required
              value={form.role}
              onChange={(event) =>
                updateField("role", event.target.value as UserRole)
              }
              className={formControlClassName}
            >
              <option value="RECRUITER">Рекрутер</option>
              <option value="ADMIN">Адміністратор</option>
            </select>
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Скасувати
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Збереження…
                </>
              ) : isCreate ? (
                "Надіслати запрошення"
              ) : (
                "Зберегти"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
