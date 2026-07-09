import { InterviewType } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  ApiError,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import { requireAdminUser } from "@/lib/auth/server";
import { requireString, optionalString } from "@/lib/api/validation";

export async function GET() {
  try {
    await requireAdminUser();
    const items = await prisma.interviewTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
    return jsonResponse(items);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const body = await parseJsonBody<Record<string, unknown>>(request);

    const item = await prisma.interviewTemplate.create({
      data: {
        title: requireString(body.title, "title"),
        subject: optionalString(body.subject),
        body: requireString(body.body, "body"),
        durationMinutes: Number(body.durationMinutes ?? 45),
        type: (optionalString(body.type) as InterviewType) ?? "ONLINE",
      },
    });
    return jsonResponse(item, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) throw new ApiError(400, "id is required");

    await prisma.interviewTemplate.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
