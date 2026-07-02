import prisma from "@/lib/prisma";
import { requireAdminUser } from "@/lib/auth/server";
import { errorResponse, jsonResponse } from "@/lib/api/response";

export async function GET() {
  try {
    await requireAdminUser();

    const invitations = await prisma.invitation.findMany({
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse(invitations);
  } catch (error) {
    return errorResponse(error);
  }
}
