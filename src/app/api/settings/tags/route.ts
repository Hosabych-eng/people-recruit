import prisma from "@/lib/prisma";
import {
  ApiError,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import { requireAdminUser } from "@/lib/auth/server";
import { requireString, optionalString } from "@/lib/api/validation";

export async function GET() {
  try {
    await requireAdminUser();
    const items = await prisma.candidateTag.findMany({ orderBy: { name: "asc" } });
    return jsonResponse(items);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const name = requireString(body.name, "name");
    const color = optionalString(body.color) ?? "#6366f1";

    const item = await prisma.candidateTag.create({ data: { name, color } });
    return jsonResponse(item, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) throw new ApiError(400, "id is required");

    await prisma.candidateTag.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
