import { getServerSession } from "next-auth";
import { ApiError } from "@/lib/api/response";
import { authOptions } from "@/lib/auth";
import { isAdmin, toSessionUser, type SessionUser } from "@/lib/auth-session";

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return null;
  }

  return toSessionUser({
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    role: session.user.role,
  });
}

export async function requireSessionUser(): Promise<SessionUser> {
  const session = await getSessionUser();

  if (!session) {
    throw new ApiError(401, "Unauthorized");
  }

  return session;
}

export async function requireStaffUser(): Promise<SessionUser> {
  return requireSessionUser();
}

export async function requireAdminUser(): Promise<SessionUser> {
  const session = await requireSessionUser();

  if (!isAdmin(session)) {
    throw new ApiError(403, "Admin access required");
  }

  return session;
}

export { isAdmin };
