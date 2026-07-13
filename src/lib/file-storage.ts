import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import {
  deleteObjectFromSupabase,
  downloadBufferFromSupabase,
  getCandidateDocumentsBucket,
  getTestTemplatesBucket,
  isSupabaseStorageEnabled,
  uploadBufferToSupabase,
} from "@/lib/supabase-storage";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");

const ALLOWED_TEMPLATE_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
  ".xlsx",
  ".xls",
  ".csv",
  ".zip",
]);

const ALLOWED_TEMPLATE_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
  "application/zip",
  "application/x-zip-compressed",
  "multipart/x-zip",
]);

/** Always rejected — even if MIME is spoofed as an allowed type. */
const BLOCKED_EXECUTABLE_EXTENSIONS = new Set([
  ".exe",
  ".sh",
  ".bat",
  ".js",
  ".mjs",
  ".cjs",
  ".cmd",
  ".com",
  ".msi",
  ".ps1",
  ".vbs",
  ".jar",
]);

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  ...ALLOWED_TEMPLATE_MIME_TYPES,
  "image/png",
  "image/jpeg",
  "image/webp",
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

function normalizeExtension(fileName: string) {
  return path.extname(fileName).toLowerCase();
}

function normalizeMimeType(mimeType: string) {
  return mimeType.toLowerCase().split(";")[0]?.trim() || "";
}

/** True if any suffix segment is a blocked executable (e.g. report.pdf.exe). */
function hasBlockedExecutableSuffix(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  if (parts.length < 2) return false;
  return parts.slice(1).some((part) => BLOCKED_EXECUTABLE_EXTENSIONS.has(`.${part}`));
}

async function ensureDirectory(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

function getBucketForCategory(category: "test-templates" | "candidate-documents") {
  return category === "candidate-documents"
    ? getCandidateDocumentsBucket()
    : getTestTemplatesBucket();
}

function buildObjectPath(
  category: "test-templates" | "candidate-documents",
  storedName: string,
  candidateId?: string,
) {
  return category === "candidate-documents" && candidateId
    ? `${candidateId}/${storedName}`
    : `${category}/${storedName}`;
}

export function assertTemplateMimeType(mimeType: string, fileName?: string) {
  const extension = fileName ? normalizeExtension(fileName) : "";
  const normalizedMime = normalizeMimeType(mimeType);

  if (
    (extension && BLOCKED_EXECUTABLE_EXTENSIONS.has(extension)) ||
    (fileName && hasBlockedExecutableSuffix(fileName))
  ) {
    throw new Error("Заборонений тип файлу (виконувані файли не дозволені)");
  }

  if (extension && !ALLOWED_TEMPLATE_EXTENSIONS.has(extension)) {
    throw new Error(
      "Дозволені формати: PDF, DOC, DOCX, TXT, XLSX, XLS, CSV, ZIP",
    );
  }

  const mimeAllowed =
    !normalizedMime ||
    normalizedMime === "application/octet-stream" ||
    ALLOWED_TEMPLATE_MIME_TYPES.has(normalizedMime);

  if (!mimeAllowed) {
    throw new Error(
      "Дозволені формати: PDF, DOC, DOCX, TXT, XLSX, XLS, CSV, ZIP",
    );
  }

  // Extension required when MIME is empty/generic so .exe cannot slip through.
  if (
    (!normalizedMime || normalizedMime === "application/octet-stream") &&
    !extension
  ) {
    throw new Error(
      "Дозволені формати: PDF, DOC, DOCX, TXT, XLSX, XLS, CSV, ZIP",
    );
  }
}

export function assertDocumentMimeType(mimeType: string) {
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType)) {
    throw new Error("Непідтримуваний тип файлу");
  }
}

export async function saveBufferToStorage(
  category: "test-templates" | "candidate-documents",
  input: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    candidateId?: string;
  },
): Promise<SavedFile> {
  const originalName = sanitizeFileName(input.fileName);
  const extension = path.extname(originalName);
  const storedName = `${randomUUID()}${extension}`;
  const objectPath = buildObjectPath(category, storedName, input.candidateId);

  if (isSupabaseStorageEnabled()) {
    await uploadBufferToSupabase({
      bucket: getBucketForCategory(category),
      objectPath,
      buffer: input.buffer,
      contentType: input.mimeType,
    });

    return {
      fileName: originalName,
      filePath: objectPath,
      mimeType: input.mimeType,
      fileSize: input.buffer.byteLength,
    };
  }

  const relativeDir =
    category === "candidate-documents" && input.candidateId
      ? path.join(category, input.candidateId)
      : category;
  const absoluteDir = path.join(STORAGE_ROOT, relativeDir);
  await ensureDirectory(absoluteDir);
  const absolutePath = path.join(absoluteDir, storedName);
  await fs.writeFile(absolutePath, input.buffer);

  return {
    fileName: originalName,
    filePath: path.join(relativeDir, storedName),
    mimeType: input.mimeType,
    fileSize: input.buffer.byteLength,
  };
}

export async function saveUploadedFile(
  category: "test-templates" | "candidate-documents",
  file: File,
  options?: { candidateId?: string },
): Promise<SavedFile> {
  const mimeType = file.type || "application/octet-stream";
  const buffer = Buffer.from(await file.arrayBuffer());
  return saveBufferToStorage(category, {
    buffer,
    fileName: file.name,
    mimeType,
    candidateId: options?.candidateId,
  });
}

export async function saveRemoteFileToStorage(
  category: "test-templates" | "candidate-documents",
  input: {
    url: string;
    fileName: string;
    mimeType?: string;
    headers?: Record<string, string>;
    candidateId?: string;
  },
): Promise<SavedFile> {
  const response = await fetch(input.url, {
    headers: input.headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to download remote file (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType =
    input.mimeType ??
    response.headers.get("content-type")?.split(";")[0]?.trim() ??
    "application/octet-stream";

  return saveBufferToStorage(category, {
    buffer,
    fileName: input.fileName,
    mimeType,
    candidateId: input.candidateId,
  });
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
  if (isSupabaseStorageEnabled()) {
    const bucket = relativePath.includes("/") && !relativePath.startsWith("test-templates/")
      ? getCandidateDocumentsBucket()
      : relativePath.startsWith("test-templates/")
        ? getTestTemplatesBucket()
        : getCandidateDocumentsBucket();
    return downloadBufferFromSupabase(bucket, relativePath);
  }

  return fs.readFile(resolveStoredFilePath(relativePath));
}

export async function deleteStoredFile(relativePath: string) {
  if (isSupabaseStorageEnabled()) {
    const bucket = relativePath.startsWith("test-templates/")
      ? getTestTemplatesBucket()
      : getCandidateDocumentsBucket();
    await deleteObjectFromSupabase(bucket, relativePath);
    return;
  }

  try {
    await fs.unlink(resolveStoredFilePath(relativePath));
  } catch {
    // File may already be gone.
  }
}
