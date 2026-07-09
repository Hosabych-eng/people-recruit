import { getCandidateOrThrow } from "@/lib/api/helpers";
import { ApiError, errorResponse, jsonResponse } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import {
  analyzeCandidateResume,
  extractPdfText,
} from "@/lib/gemini/candidate-analysis";
import { getResumePdfBuffer } from "@/lib/resume-content";
import { saveCandidateSkills } from "@/lib/candidate-skills";
import { indexCandidateResumeText } from "@/lib/resume-indexing";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    const candidate = await getCandidateOrThrow(id, session);

    const resumeDoc = await prisma.candidateDocument.findFirst({
      where: { candidateId: id, category: "RESUME" },
      orderBy: { createdAt: "desc" },
    });

    const buffer = await getResumePdfBuffer({
      filePath: resumeDoc?.filePath,
      resumeLink: candidate.resumeLink,
      mimeType: resumeDoc?.mimeType,
      fileName: resumeDoc?.fileName,
    });
    const resumeText = await extractPdfText(buffer);
    if (!resumeText) {
      throw new ApiError(400, "Не вдалося витягти текст з PDF-резюме");
    }

    const analysis = await analyzeCandidateResume({
      candidateName: candidate.name,
      job: candidate.job,
      resumeText,
    });

    await prisma.candidate.update({
      where: { id },
      data: {
        resumeText: resumeText.slice(0, 100_000),
        score: Math.max(0, Math.min(5, Math.round(analysis.matchScore / 20))),
      },
    });
    await saveCandidateSkills(id, analysis.skills);

    return jsonResponse(analysis);
  } catch (error) {
    return errorResponse(error);
  }
}
