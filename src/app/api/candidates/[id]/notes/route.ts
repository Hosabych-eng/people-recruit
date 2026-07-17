import prisma from "@/lib/prisma";
import { getCandidateOrThrow } from "@/lib/api/helpers";
import {
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import { ApiError } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";

import { sanitizeNoteHtml, noteHtmlIsEmpty } from "@/lib/note-html";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getCandidateOrThrow(id, session);

    const notes = await prisma.candidateNote.findMany({
      where: { candidateId: id },
      orderBy: { createdAt: "asc" },
    });

    return jsonResponse(notes);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getCandidateOrThrow(id, session);

    const body = await parseJsonBody<{ content?: unknown }>(request);

    if (typeof body.content !== "string" || noteHtmlIsEmpty(body.content)) {
      throw new ApiError(400, "content is required");
    }

    const content = sanitizeNoteHtml(body.content);

    if (noteHtmlIsEmpty(content)) {
      throw new ApiError(400, "content is required");
    }

    const author = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, image: true },
    });

    const note = await prisma.candidateNote.create({
      data: {
        candidateId: id,
        content,
        authorId: session.id,
        authorName: author?.name ?? session.name,
        authorRole: session.role === "ADMIN" ? "Administrator" : "Middle Recruiter",
        authorPhotoUrl: author?.image ?? null,
      },
    });

    return jsonResponse(note, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
