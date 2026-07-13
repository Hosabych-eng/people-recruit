import prisma from "@/lib/prisma";
import { getCandidateOrThrow } from "@/lib/api/helpers";
import { ApiError, errorResponse, jsonResponse } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import {
  assertTemplateMimeType,
  deleteStoredFile,
  saveUploadedFile,
} from "@/lib/file-storage";
import { serializeTestAssignmentTemplate } from "@/lib/test-assignments";

export async function GET() {
  try {
    await requireSessionUser();
    const templates = await prisma.testAssignmentTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
    return jsonResponse(templates.map(serializeTestAssignmentTemplate));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSessionUser();
    const formData = await request.formData();
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const file = formData.get("file");

    if (!title) {
      throw new ApiError(400, "Назва шаблону обов'язкова");
    }

    if (!(file instanceof File) || file.size === 0) {
      throw new ApiError(400, "Потрібно завантажити файл шаблону");
    }

    assertTemplateMimeType(file.type || "application/octet-stream", file.name);
    const saved = await saveUploadedFile("test-templates", file);

    const template = await prisma.testAssignmentTemplate.create({
      data: {
        title,
        description: description || null,
        fileName: saved.fileName,
        filePath: saved.filePath,
        mimeType: saved.mimeType,
        fileSize: saved.fileSize,
        uploadedById: session.id,
        uploadedByName: session.name,
      },
    });

    return jsonResponse(serializeTestAssignmentTemplate(template), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
