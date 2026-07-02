import prisma from "@/lib/prisma";
import { requireSessionUser } from "@/lib/auth/server";
import {
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import { parseCreateKnowledgeArticleBody } from "@/lib/api/validation";

export async function GET() {
  try {
    const articles = await prisma.knowledgeArticle.findMany({
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse(articles);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSessionUser();
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const input = parseCreateKnowledgeArticleBody(body);

    const article = await prisma.knowledgeArticle.create({
      data: {
        title: input.title,
        content: input.content,
        authorId: session.id,
        authorName: session.name,
      },
    });

    return jsonResponse(article, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
