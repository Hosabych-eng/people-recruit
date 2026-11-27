import prisma from "@/lib/prisma";
import {
  ApiError,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import { parseUpdateKnowledgeArticleBody } from "@/lib/api/validation";
import { requireSessionUser } from "@/lib/auth/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireSessionUser();
    const { id } = await context.params;
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const updates = parseUpdateKnowledgeArticleBody(body);

    const existing = await prisma.knowledgeArticle.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, "Knowledge article not found");
    }

    const article = await prisma.knowledgeArticle.update({
      where: { id },
      data: updates,
    });

    return jsonResponse(article);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireSessionUser();
    const { id } = await context.params;

    const existing = await prisma.knowledgeArticle.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, "Knowledge article not found");
    }

    await prisma.knowledgeArticle.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
