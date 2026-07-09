import prisma from "@/lib/prisma";
import { extractPdfText } from "@/lib/gemini/candidate-analysis";
import { readStoredFile } from "@/lib/file-storage";

export async function indexCandidateResumeText(candidateId: string, buffer?: Buffer) {
  let text = "";

  if (buffer) {
    text = await extractPdfText(buffer);
  } else {
    const resumeDoc = await prisma.candidateDocument.findFirst({
      where: { candidateId, category: "RESUME" },
      orderBy: { createdAt: "desc" },
    });
    if (!resumeDoc) return null;

    const fileBuffer = await readStoredFile(resumeDoc.filePath);
    text = await extractPdfText(fileBuffer);
  }

  const normalized = text.trim();
  if (!normalized) return null;

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { resumeText: normalized.slice(0, 100_000) },
  });

  return normalized;
}
