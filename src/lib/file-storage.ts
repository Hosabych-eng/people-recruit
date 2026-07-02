import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");

const ALLOWED_TEMPLATE_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  ...ALLOWED_TEMPLATE_MIME_TYPES,
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
]);

export type SavedFile = {
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
};

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^\w.\-() ]+/g, "_").trim() || "file";
}

async function ensureDirectory(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export function assertTemplateMimeType(mimeType: string) {
  if (!ALLOWED_TEMPLATE_MIME_TYPES.has(mimeType)) {
    throw new Error("Дозволені лише файли PDF або DOC/DOCX");
  }
}

export function assertDocumentMimeType(mimeType: string) {
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType)) {
    throw new Error("Непідтримуваний тип файлу");
  }
}

export async function saveUploadedFile(
  category: "test-templates" | "candidate-documents",
  file: File,
  options?: { candidateId?: string },
): Promise<SavedFile> {
  const mimeType = file.type || "application/octet-stream";
  const originalName = sanitizeFileName(file.name);
  const extension = path.extname(originalName);
  const storedName = `${randomUUID()}${extension}`;
  const relativeDir =
    category === "candidate-documents" && options?.candidateId
      ? path.join(category, options.candidateId)
      : category;
  const absoluteDir = path.join(STORAGE_ROOT, relativeDir);
  await ensureDirectory(absoluteDir);

  const absolutePath = path.join(absoluteDir, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);

  return {
    fileName: originalName,
    filePath: path.join(relativeDir, storedName),
    mimeType,
    fileSize: buffer.byteLength,
  };
}

export function resolveStoredFilePath(relativePath: string) {
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const absolutePath = path.join(STORAGE_ROOT, normalized);
  if (!absolutePath.startsWith(STORAGE_ROOT)) {
    throw new Error("Invalid file path");
  }
  return absolutePath;
}

export async function readStoredFile(relativePath: string) {
  return fs.readFile(resolveStoredFilePath(relativePath));
}

export async function deleteStoredFile(relativePath: string) {
  try {
    await fs.unlink(resolveStoredFilePath(relativePath));
  } catch {
    // File may already be gone.
  }
}
