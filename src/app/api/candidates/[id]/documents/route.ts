import prisma from "@/lib/prisma";
import { getCandidateOrThrow } from "@/lib/api/helpers";
import { ApiError, errorResponse, jsonResponse } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import {
  assertDocumentMimeType,
  deleteStoredFile,
  saveUploadedFile,
} from "@/lib/file-storage";
import { serializeCandidateDocument } from "@/lib/test-assignments";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const CATEGORY_VALUES = new Set(["RESUME", "PORTFOLIO", "OTHER"]);

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireSessionUser();
    const { id } = await context.params;
    await getCandidateOrThrow(id);

    const documents = await prisma.candidateDocument.findMany({
      where: { candidateId: id },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse(documents.map(serializeCandidateDocument));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getCandidateOrThrow(id);

    const formData = await request.formData();
    const title = String(formData.get("title") ?? "").trim();
    const category = String(formData.get("category") ?? "OTHER").trim();
    const file = formData.get("file");

    if (!title) {
      throw new ApiError(400, "Назва документа обов'язкова");
    }

    if (!CATEGORY_VALUES.has(category)) {
      throw new ApiError(400, "Invalid document category");
    }

    if (!(file instanceof File) || file.size === 0) {
      throw new ApiError(400, "Потрібно завантажити файл");
    }

    assertDocumentMimeType(file.type || "application/octet-stream");
    const saved = await saveUploadedFile("candidate-documents", file, {
      candidateId: id,
    });

    const document = await prisma.candidateDocument.create({
      data: {
        candidateId: id,
        category: category as "RESUME" | "PORTFOLIO" | "OTHER",
        title,
        fileName: saved.fileName,
        filePath: saved.filePath,
        mimeType: saved.mimeType,
        fileSize: saved.fileSize,
        uploadedById: session.id,
        uploadedByName: session.name,
      },
    });

    return jsonResponse(serializeCandidateDocument(document), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
