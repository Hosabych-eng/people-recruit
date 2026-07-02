export type UserRole = "ADMIN" | "RECRUITER";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export function isAdmin(user: SessionUser | null | undefined): user is SessionUser {
  return user?.role === "ADMIN";
}

export function canManageVacancies(
  user: SessionUser | null | undefined,
): user is SessionUser {
  return user?.role === "ADMIN" || user?.role === "RECRUITER";
}

export function toSessionUser(user: {
  id: string;
  email: string | null;
  name: string | null;
  role: UserRole;
}): SessionUser | null {
  if (!user.email) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email,
    role: user.role,
  };
}
