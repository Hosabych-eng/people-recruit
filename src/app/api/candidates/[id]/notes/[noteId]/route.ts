import prisma from "@/lib/prisma";
import { getCandidateOrThrow } from "@/lib/api/helpers";
import {
  ApiError,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";

type RouteContext = {
  params: Promise<{ id: string; noteId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id, noteId } = await context.params;
    await getCandidateOrThrow(id, session);

    const body = await parseJsonBody<{ content?: unknown }>(request);
    if (typeof body.content !== "string" || !body.content.trim()) {
      throw new ApiError(400, "content is required");
    }

    const existing = await prisma.candidateNote.findFirst({
      where: { id: noteId, candidateId: id },
    });

    if (!existing) {
      throw new ApiError(404, "Note not found");
    }

    const note = await prisma.candidateNote.update({
      where: { id: noteId },
      data: { content: body.content.trim() },
    });

    return jsonResponse(note);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id, noteId } = await context.params;
    await getCandidateOrThrow(id, session);

    const existing = await prisma.candidateNote.findFirst({
      where: { id: noteId, candidateId: id },
    });

    if (!existing) {
      throw new ApiError(404, "Note not found");
    }

    await prisma.candidateNote.delete({ where: { id: noteId } });
    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
