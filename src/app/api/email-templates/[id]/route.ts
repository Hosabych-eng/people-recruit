import prisma from "@/lib/prisma";
import { ApiError, errorResponse, jsonResponse, parseJsonBody } from "@/lib/api/response";
import { parseUpdateEmailTemplateBody } from "@/lib/api/validation";
import { requireSessionUser } from "@/lib/auth/server";
import { serializeEmailTemplate } from "@/lib/email-templates";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireSessionUser();
    const { id } = await context.params;
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const updates = parseUpdateEmailTemplateBody(body);

    const existing = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, "Email template not found");
    }

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: updates,
    });

    return jsonResponse(serializeEmailTemplate(template));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireSessionUser();
    const { id } = await context.params;

    const existing = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, "Email template not found");
    }

    await prisma.emailTemplate.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
