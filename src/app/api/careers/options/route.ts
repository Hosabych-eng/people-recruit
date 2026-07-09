import { errorResponse, jsonResponse } from "@/lib/api/response";
import { ensureDefaultSettings } from "@/lib/settings/defaults";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    await ensureDefaultSettings();

    const [englishLevels, chineseLevels] = await Promise.all([
      prisma.languageLevelOption.findMany({
        where: { language: "ENGLISH" },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.languageLevelOption.findMany({
        where: { language: "CHINESE" },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return jsonResponse({ englishLevels, chineseLevels });
  } catch (error) {
    return errorResponse(error);
  }
}
