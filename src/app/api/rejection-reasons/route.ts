import prisma from "@/lib/prisma";
import { errorResponse, jsonResponse } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import { ensureDefaultRejectionReasons } from "@/lib/rejection-reasons";

export async function GET() {
  try {
    await requireSessionUser();
    await ensureDefaultRejectionReasons();
    const items = await prisma.rejectionReason.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return jsonResponse(items);
  } catch (error) {
    return errorResponse(error);
  }
}
