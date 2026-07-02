"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { signOut, useSession } from "next-auth/react";
import {
  canManageVacancies,
  isAdmin,
  toSessionUser,
  type SessionUser,
} from "@/lib/auth-session";

type AuthContextValue = {
  user: SessionUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  canManageVacancies: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession();

  const user = useMemo(() => {
    if (!session?.user?.id || session.user.status !== "ACTIVE") {
      return null;
    }

    return toSessionUser({
      id: session.user.id,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
      role: session.user.role,
    });
  }, [session]);

  const refresh = useCallback(async () => {
    await update();
  }, [update]);

  const logout = useCallback(async () => {
    await signOut({ callbackUrl: "/login" });
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading: status === "loading",
      isAdmin: isAdmin(user),
      canManageVacancies: canManageVacancies(user),
      refresh,
      logout,
    }),
    [user, status, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
