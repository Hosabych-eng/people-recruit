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
    const items = await prisma.pipelineStageTemplate.findMany({
      orderBy: { orderInPipeline: "asc" },
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
    const name = requireString(body.name, "name");
    const orderInPipeline = Number(body.orderInPipeline ?? 0);
    const color = optionalString(body.color) ?? "#64748b";

    const item = await prisma.pipelineStageTemplate.create({
      data: { name, orderInPipeline, color },
    });
    return jsonResponse(item, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminUser();
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const id = requireString(body.id, "id");

    const item = await prisma.pipelineStageTemplate.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: requireString(body.name, "name") } : {}),
        ...(body.orderInPipeline !== undefined
          ? { orderInPipeline: Number(body.orderInPipeline) }
          : {}),
        ...(body.color !== undefined
          ? { color: optionalString(body.color) ?? "#64748b" }
          : {}),
      },
    });
    return jsonResponse(item);
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

    await prisma.pipelineStageTemplate.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
