import prisma from "@/lib/prisma";
import { getCandidateOrThrow } from "@/lib/api/helpers";
import {
  ApiError,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import { requireString } from "@/lib/api/validation";
import { requireSessionUser } from "@/lib/auth/server";

type RouteContext = { params: Promise<{ id: string; linkId: string }> };

function serializeLink(link: {
  id: string;
  label: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: link.id,
    label: link.label,
    url: link.url,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
  };
}

async function getOwnedLinkOrThrow(candidateId: string, linkId: string) {
  const link = await prisma.candidateLink.findFirst({
    where: { id: linkId, candidateId },
  });
  if (!link) {
    throw new ApiError(404, "Link not found");
  }
  return link;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id, linkId } = await context.params;
    await getCandidateOrThrow(id, session);
    await getOwnedLinkOrThrow(id, linkId);

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const data: { label?: string; url?: string } = {};

    if ("label" in body) data.label = requireString(body.label, "label");
    if ("url" in body) {
      const url = requireString(body.url, "url");
      try {
        // eslint-disable-next-line no-new
        new URL(url);
      } catch {
        throw new ApiError(400, "url must be a valid absolute URL");
      }
      data.url = url;
    }

    if (Object.keys(data).length === 0) {
      throw new ApiError(400, "At least one field must be provided for update");
    }

    const link = await prisma.candidateLink.update({
      where: { id: linkId },
      data,
    });

    return jsonResponse(serializeLink(link));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id, linkId } = await context.params;
    await getCandidateOrThrow(id, session);
    await getOwnedLinkOrThrow(id, linkId);

    await prisma.candidateLink.delete({ where: { id: linkId } });
    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
