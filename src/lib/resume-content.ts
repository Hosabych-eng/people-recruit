import { ApiError } from "@/lib/api/response";
import { readStoredFile } from "@/lib/file-storage";
import { isPdfUrl } from "@/lib/resume-helpers";

async function fetchPdfFromUrl(url: string) {
  const response = await fetch(url, {
    headers: { Accept: "application/pdf,*/*" },
  });
  if (!response.ok) {
    throw new ApiError(400, "Не вдалося завантажити PDF за посиланням на резюме");
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function getResumePdfBuffer(input: {
  filePath?: string | null;
  resumeLink?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
}) {
  if (input.filePath) {
    try {
      return await readStoredFile(input.filePath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        throw error;
      }
    }
  }

  const resumeLink = input.resumeLink?.trim();
  if (resumeLink && isPdfUrl(resumeLink)) {
    return fetchPdfFromUrl(resumeLink);
  }

  const hasPdfMime = input.mimeType === "application/pdf";
  const hasPdfName = input.fileName?.toLowerCase().endsWith(".pdf") ?? false;
  if (resumeLink && (hasPdfMime || hasPdfName)) {
    return fetchPdfFromUrl(resumeLink);
  }

  throw new ApiError(
    400,
    "Завантажте PDF-резюме в документи кандидата або додайте посилання на PDF",
  );
}
