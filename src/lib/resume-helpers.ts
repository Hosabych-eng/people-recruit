export function isPdfUrl(url: string) {
  const normalized = url.toLowerCase().split("?")[0] ?? url;
  return normalized.endsWith(".pdf");
}

export function isValidResumePreviewUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;

  const trimmed = url.trim();

  if (trimmed.startsWith("/api/candidates/")) return true;

  const lower = trimmed.toLowerCase();
  if (lower.includes("example.com")) return false;

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname === "example.com" || parsed.hostname.endsWith(".example.com")) {
      return false;
    }
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function resolveResumePreviewUrl(
  profile: { id: string; resumeLink?: string | null },
  resumeDoc?: { id: string; category: string } | null,
): string | null {
  if (resumeDoc) {
    return `/api/candidates/${profile.id}/documents/${resumeDoc.id}`;
  }

  const link = profile.resumeLink?.trim();
  if (!link || !isValidResumePreviewUrl(link)) return null;

  return link;
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
