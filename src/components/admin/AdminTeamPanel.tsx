"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { UserCard } from "@/components/admin/UserCard";
import {
  UserFormModal,
  type TeamInvitation,
  type TeamUser,
} from "@/components/admin/UserFormModal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export function AdminTeamPanel() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null);

  const loadTeam = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [usersResponse, invitationsResponse] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/invitations"),
      ]);

      const usersData = await usersResponse.json();
      const invitationsData = await invitationsResponse.json();

      if (!usersResponse.ok) {
        throw new Error(usersData.error ?? "Не вдалося завантажити користувачів");
      }

      if (!invitationsResponse.ok) {
        throw new Error(invitationsData.error ?? "Не вдалося завантажити запрошення");
      }

      setUsers(usersData);
      setInvitations(invitationsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося завантажити дані");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const revokeInvitation = async (id: string) => {
    const response = await fetch(`/api/invitations/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error ?? "Не вдалося скасувати запрошення");
    }
    await loadTeam();
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Адмін-панель
          </p>
          <h1 className="text-xl font-semibold text-foreground">Доступ команди</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Запрошуйте рекрутерів через Google OAuth. Лише активні користувачі та
            валідні інвайти можуть увійти.
          </p>
        </div>

        <Button size="sm" onClick={() => setIsAddOpen(true)}>
          Запросити користувача
        </Button>
      </div>

      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadTeam}>
            Повторити
          </Button>
        </div>
      )}

      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Активні користувачі
              </h2>
              <p className="text-sm text-muted">Облікові записи з доступом до системи.</p>
            </div>
            <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted ring-1 ring-border">
              {users.length}
            </span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-7 w-7" />
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted">
              Ще немає активних користувачів.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {users.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  isCurrentUser={user.id === currentUser?.id}
                  onEdit={setEditingUser}
                  onDeleted={loadTeam}
                />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Очікують запрошення
              </h2>
              <p className="text-sm text-muted">
                Користувачі з цими email зможуть увійти через Google.
              </p>
            </div>
            <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted ring-1 ring-border">
              {invitations.length}
            </span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner className="h-6 w-6" />
            </div>
          ) : invitations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
              Немає активних запрошень.
            </div>
          ) : (
            <ul className="space-y-3">
              {invitations.map((invitation) => (
                <li
                  key={invitation.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-foreground">{invitation.email}</p>
                    <p className="text-xs text-muted">
                      {invitation.role === "ADMIN" ? "Адміністратор" : "Рекрутер"} · дійсне до{" "}
                      {new Intl.DateTimeFormat("uk-UA", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(invitation.expiresAt))}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void revokeInvitation(invitation.id)}
                  >
                    Скасувати
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <UserFormModal
        mode="create"
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSaved={loadTeam}
      />

      <UserFormModal
        mode="edit"
        user={editingUser}
        isOpen={editingUser !== null}
        onClose={() => setEditingUser(null)}
        onSaved={loadTeam}
      />
    </div>
  );
}
