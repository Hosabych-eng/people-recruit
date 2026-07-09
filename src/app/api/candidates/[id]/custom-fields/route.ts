import prisma from "@/lib/prisma";
import { getCandidateOrThrow } from "@/lib/api/helpers";
import { ApiError, errorResponse, jsonResponse, parseJsonBody } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import { getAllCandidateFieldDefinitions } from "@/lib/candidate-fields";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getCandidateOrThrow(id, session);

    const body = await parseJsonBody<{ values?: Record<string, unknown> }>(request);
    if (!body.values || typeof body.values !== "object") {
      throw new ApiError(400, "values object is required");
    }

    const definitions = await getAllCandidateFieldDefinitions();
    const customFields = definitions.filter((field) => field.isCustom);

    await Promise.all(
      customFields.map((field) => {
        if (!(field.fieldKey in body.values!)) return Promise.resolve();
        const value = body.values![field.fieldKey];
        const normalized =
          value === null || value === undefined ? null : String(value).trim() || null;

        if (field.fieldType === "DROPDOWN" && normalized && !field.options.includes(normalized)) {
          throw new ApiError(400, `Invalid value for ${field.label}`);
        }

        return prisma.candidateCustomFieldValue.upsert({
          where: {
            candidateId_fieldKey: { candidateId: id, fieldKey: field.fieldKey },
          },
          create: {
            candidateId: id,
            fieldKey: field.fieldKey,
            value: normalized,
          },
          update: { value: normalized },
        });
      }),
    );

    const saved = await prisma.candidateCustomFieldValue.findMany({
      where: { candidateId: id },
    });

    const customFieldsMap = Object.fromEntries(
      saved.map((row) => [row.fieldKey, row.value ?? ""]),
    );

    return jsonResponse({ customFields: customFieldsMap });
  } catch (error) {
    return errorResponse(error);
  }
}
