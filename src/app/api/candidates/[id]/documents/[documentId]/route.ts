import prisma from "@/lib/prisma";
import { getCandidateOrThrow } from "@/lib/api/helpers";
import { ApiError, errorResponse, jsonResponse } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import { deleteStoredFile, readStoredFile } from "@/lib/file-storage";

type RouteContext = {
  params: Promise<{ id: string; documentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id, documentId } = await context.params;
    await getCandidateOrThrow(id, session);

    const document = await prisma.candidateDocument.findFirst({
      where: { id: documentId, candidateId: id },
    });

    if (!document) {
      throw new ApiError(404, "Document not found");
    }

    const file = await readStoredFile(document.filePath);
    const disposition =
      document.mimeType.startsWith("image/") || document.mimeType === "application/pdf"
        ? "inline"
        : "attachment";

    return new Response(file, {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(document.fileName)}"`,
        "Content-Length": String(file.byteLength),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id, documentId } = await context.params;
    await getCandidateOrThrow(id, session);

    const document = await prisma.candidateDocument.findFirst({
      where: { id: documentId, candidateId: id },
    });

    if (!document) {
      throw new ApiError(404, "Document not found");
    }

    await prisma.candidateDocument.delete({ where: { id: documentId } });
    await deleteStoredFile(document.filePath);

    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
