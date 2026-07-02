import prisma from "@/lib/prisma";
import { errorResponse, jsonResponse, parseJsonBody } from "@/lib/api/response";
import {
  parseCreateEmailTemplateBody,
} from "@/lib/api/validation";
import { requireSessionUser } from "@/lib/auth/server";
import { serializeEmailTemplate } from "@/lib/email-templates";

export async function GET() {
  try {
    await requireSessionUser();
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
    return jsonResponse(templates.map(serializeEmailTemplate));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireSessionUser();
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const input = parseCreateEmailTemplateBody(body);

    const template = await prisma.emailTemplate.create({
      data: input,
    });

    return jsonResponse(serializeEmailTemplate(template), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
