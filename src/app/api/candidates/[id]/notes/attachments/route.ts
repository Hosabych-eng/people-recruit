import prisma from "@/lib/prisma";
import { getCandidateOrThrow } from "@/lib/api/helpers";
import { ApiError, errorResponse, jsonResponse } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import {
  assertDocumentMimeType,
  saveUploadedFile,
} from "@/lib/file-storage";
import { serializeCandidateDocument } from "@/lib/test-assignments";

type RouteContext = { params: Promise<{ id: string }> };

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/**
 * Upload image/file for note editor. Reuses document MIME + executable blocking.
 * Stores as CandidateDocument (OTHER) so existing download route serves it.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getCandidateOrThrow(id, session);

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      throw new ApiError(400, "Потрібно завантажити файл");
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new ApiError(400, "Файл завеликий (макс. 10 МБ)");
    }

    assertDocumentMimeType(file.type || "application/octet-stream", file.name);
    const saved = await saveUploadedFile("candidate-documents", file, {
      candidateId: id,
    });

    const document = await prisma.candidateDocument.create({
      data: {
        candidateId: id,
        category: "OTHER",
        title: `Примітка: ${saved.fileName}`,
        fileName: saved.fileName,
        filePath: saved.filePath,
        mimeType: saved.mimeType,
        fileSize: saved.fileSize,
        uploadedById: session.id,
        uploadedByName: session.name,
      },
    });

    const serialized = serializeCandidateDocument(document);
    return jsonResponse(
      {
        ...serialized,
        url: `/api/candidates/${id}/documents/${document.id}`,
      },
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
