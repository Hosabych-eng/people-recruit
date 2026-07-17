import prisma from "@/lib/prisma";
import { errorResponse, jsonResponse } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";

export async function GET() {
  try {
    await requireSessionUser();

    const recruiters = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return jsonResponse(recruiters);
  } catch (error) {
    return errorResponse(error);
  }
}
