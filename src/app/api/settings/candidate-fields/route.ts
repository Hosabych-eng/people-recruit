import { CandidateFieldType } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  ApiError,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import { requireAdminUser, requireSessionUser } from "@/lib/auth/server";
import {
  getAllCandidateFieldDefinitions,
  serializeFieldDefinition,
  slugifyFieldKey,
} from "@/lib/candidate-fields";
import { optionalString, requireString } from "@/lib/api/validation";

export async function GET() {
  try {
    await requireSessionUser();
    const fields = await getAllCandidateFieldDefinitions();
    return jsonResponse(fields);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const label = requireString(body.label, "label");
    const fieldType = (optionalString(body.fieldType) ?? "TEXT") as CandidateFieldType;

    if (fieldType !== "TEXT" && fieldType !== "DROPDOWN") {
      throw new ApiError(400, "Custom fields must be TEXT or DROPDOWN");
    }

    const options =
      fieldType === "DROPDOWN" && Array.isArray(body.options)
        ? body.options.map((item) => String(item).trim()).filter(Boolean)
        : [];

    if (fieldType === "DROPDOWN" && options.length === 0) {
      throw new ApiError(400, "DROPDOWN fields require at least one option");
    }

    const maxOrder = await prisma.candidateFieldDefinition.aggregate({
      _max: { sortOrder: true },
    });

    const field = await prisma.candidateFieldDefinition.create({
      data: {
        fieldKey: slugifyFieldKey(label),
        label,
        fieldType,
        isCustom: true,
        visible: true,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
        options: options.length > 0 ? JSON.stringify(options) : null,
      },
    });

    return jsonResponse(serializeFieldDefinition(field), 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminUser();
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const id = requireString(body.id, "id");

    const existing = await prisma.candidateFieldDefinition.findUnique({
      where: { id },
    });
    if (!existing) throw new ApiError(404, "Field not found");

    const options =
      "options" in body && Array.isArray(body.options)
        ? body.options.map((item) => String(item).trim()).filter(Boolean)
        : undefined;

    const field = await prisma.candidateFieldDefinition.update({
      where: { id },
      data: {
        ...("label" in body ? { label: requireString(body.label, "label") } : {}),
        ...("visible" in body ? { visible: Boolean(body.visible) } : {}),
        ...("sortOrder" in body ? { sortOrder: Number(body.sortOrder) } : {}),
        ...(options !== undefined ? { options: JSON.stringify(options) } : {}),
      },
    });

    return jsonResponse(serializeFieldDefinition(field));
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

    const field = await prisma.candidateFieldDefinition.findUnique({ where: { id } });
    if (!field) throw new ApiError(404, "Field not found");
    if (!field.isCustom) {
      throw new ApiError(400, "Standard fields cannot be deleted");
    }

    await prisma.candidateFieldDefinition.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
