import prisma from "@/lib/prisma";
import { errorResponse, jsonResponse } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";

export async function GET() {
  try {
    await requireSessionUser();
    const items = await prisma.candidateTag.findMany({
      orderBy: { name: "asc" },
    });
    return jsonResponse(items);
  } catch (error) {
    return errorResponse(error);
  }
}
