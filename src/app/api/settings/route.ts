import prisma from "@/lib/prisma";
import { errorResponse, jsonResponse } from "@/lib/api/response";
import { requireAdminUser } from "@/lib/auth/server";
import { ensureDefaultSettings, ensureDefaultCandidateFields } from "@/lib/settings/defaults";

export async function GET() {
  try {
    await requireAdminUser();
    await ensureDefaultSettings();
    await ensureDefaultCandidateFields();

    const [tags, interviewTemplates, languageLevels] = await Promise.all([
        prisma.candidateTag.findMany({ orderBy: { name: "asc" } }),
        prisma.interviewTemplate.findMany({ orderBy: { createdAt: "desc" } }),
        prisma.languageLevelOption.findMany({
          orderBy: [{ language: "asc" }, { sortOrder: "asc" }],
        }),
      ]);

    return jsonResponse({
      tags,
      interviewTemplates,
      languageLevels,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
