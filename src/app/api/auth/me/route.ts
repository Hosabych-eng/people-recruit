import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { errorResponse, jsonResponse } from "@/lib/api/response";
import { toSessionUser } from "@/lib/auth-session";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.status !== "ACTIVE") {
      return jsonResponse({ user: null });
    }

    const user = toSessionUser({
      id: session.user.id,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
      role: session.user.role,
    });

    return jsonResponse({ user });
  } catch (error) {
    return errorResponse(error);
  }
}
