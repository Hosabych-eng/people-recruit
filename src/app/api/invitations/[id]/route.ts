import prisma from "@/lib/prisma";
import { requireAdminUser } from "@/lib/auth/server";
import { ApiError, errorResponse, jsonResponse } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireAdminUser();
    const { id } = await context.params;

    const invitation = await prisma.invitation.findUnique({ where: { id } });
    if (!invitation) {
      throw new ApiError(404, "Invitation not found");
    }

    await prisma.invitation.delete({ where: { id } });

    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
