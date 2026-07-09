export function isPdfUrl(url: string) {
  const normalized = url.toLowerCase().split("?")[0] ?? url;
  return normalized.endsWith(".pdf");
}

export function candidateHasPdfResume(input: {
  documents: { category: string; mimeType: string; fileName: string }[];
  resumeLink?: string | null;
}) {
  const resumeDoc = input.documents.find((doc) => doc.category === "RESUME");
  if (
    resumeDoc &&
    (resumeDoc.mimeType === "application/pdf" ||
      resumeDoc.fileName.toLowerCase().endsWith(".pdf"))
  ) {
    return true;
  }
  const link = input.resumeLink?.trim();
  return Boolean(link && isPdfUrl(link));
}
