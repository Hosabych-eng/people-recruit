"use client";

import { useState } from "react";
import type { TeamUser } from "@/components/admin/UserFormModal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

type UserCardProps = {
  user: TeamUser;
  isCurrentUser: boolean;
  onEdit: (user: TeamUser) => void;
  onDeleted: () => void;
};

function getInitials(name: string | null, email: string | null) {
  const source = name ?? email ?? "?";
  return source
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function roleLabel(role: TeamUser["role"]) {
  return role === "ADMIN" ? "Адміністратор" : "Рекрутер";
}

export function UserCard({
  user,
  isCurrentUser,
  onEdit,
  onDeleted,
}: UserCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Видалити ${user.name ?? user.email}? Доступ буде негайно відкликано.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Не вдалося видалити");
      }

      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося видалити");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <article className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-4">
        {user.image ? (
          <img
            src={user.image}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {getInitials(user.name, user.email)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-foreground">
                {user.name ?? user.email}
              </h3>
              <p className="mt-0.5 truncate text-sm text-muted">{user.email}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                user.role === "ADMIN"
                  ? "bg-violet-100 text-violet-700"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {roleLabel(user.role)}
            </span>
          </div>

          {isCurrentUser && (
            <p className="mt-2 text-xs text-muted">Ви в системі під цим акаунтом</p>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
        <Button variant="outline" size="sm" onClick={() => onEdit(user)}>
          Редагувати
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-red-200 text-red-700 hover:bg-red-50"
          onClick={handleDelete}
          disabled={isDeleting || isCurrentUser}
          title={isCurrentUser ? "Не можна видалити власний акаунт" : undefined}
        >
          {isDeleting ? (
            <>
              <Spinner className="mr-2 h-3.5 w-3.5" />
              Видалення…
            </>
          ) : (
            "Видалити"
          )}
        </Button>
      </div>
    </article>
  );
}
