import prisma from "@/lib/prisma";
import { deleteStoredFile } from "@/lib/file-storage";

/** Collect physical file paths for candidate documents before DB rows cascade away. */
export async function listCandidateDocumentPaths(candidateIds: string[]) {
  if (candidateIds.length === 0) return [] as string[];

  const documents = await prisma.candidateDocument.findMany({
    where: { candidateId: { in: candidateIds } },
    select: { filePath: true },
  });

  return documents.map((document) => document.filePath);
}

export async function listDocumentPathsForJob(jobId: string) {
  const documents = await prisma.candidateDocument.findMany({
    where: { candidate: { jobId } },
    select: { filePath: true },
  });

  return documents.map((document) => document.filePath);
}

/** Best-effort physical cleanup; local missing files are ignored by deleteStoredFile. */
export async function deleteStoredFiles(filePaths: string[]) {
  await Promise.all(filePaths.map((filePath) => deleteStoredFile(filePath)));
}
