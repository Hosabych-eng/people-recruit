import prisma from "@/lib/prisma";
import { ApiError, errorResponse, jsonResponse } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import { deleteStoredFile, readStoredFile } from "@/lib/file-storage";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireSessionUser();
    const { id } = await context.params;
    const template = await prisma.testAssignmentTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new ApiError(404, "Template not found");
    }

    const file = await readStoredFile(template.filePath);
    return new Response(file, {
      headers: {
        "Content-Type": template.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(template.fileName)}"`,
        "Content-Length": String(file.byteLength),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireSessionUser();
    const { id } = await context.params;
    const template = await prisma.testAssignmentTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new ApiError(404, "Template not found");
    }

    await prisma.testAssignmentTemplate.delete({ where: { id } });
    await deleteStoredFile(template.filePath);

    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
