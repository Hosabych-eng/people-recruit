import { LanguageType } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  ApiError,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import { requireAdminUser, requireSessionUser } from "@/lib/auth/server";
import { requireString } from "@/lib/api/validation";

export async function GET(request: Request) {
  try {
    await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language")?.toUpperCase();

    const items = await prisma.languageLevelOption.findMany({
      where: language
        ? { language: language as LanguageType }
        : undefined,
      orderBy: [{ language: "asc" }, { sortOrder: "asc" }],
    });
    return jsonResponse(items);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const language = requireString(body.language, "language").toUpperCase();
    const label = requireString(body.label, "label");

    if (language !== "ENGLISH" && language !== "CHINESE") {
      throw new ApiError(400, "language must be ENGLISH or CHINESE");
    }

    const maxOrder = await prisma.languageLevelOption.aggregate({
      where: { language: language as LanguageType },
      _max: { sortOrder: true },
    });

    const item = await prisma.languageLevelOption.create({
      data: {
        language: language as LanguageType,
        label,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
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

    await prisma.languageLevelOption.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
