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

type RouteContext = { params: Promise<{ id: string }> };

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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getCandidateOrThrow(id, session);

    const links = await prisma.candidateLink.findMany({
      where: { candidateId: id },
      orderBy: { createdAt: "asc" },
    });

    return jsonResponse(links.map(serializeLink));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getCandidateOrThrow(id, session);

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const label = requireString(body.label, "label");
    const url = requireString(body.url, "url");

    try {
      // Basic URL sanity — allow relative-looking paths only if absolute.
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      throw new ApiError(400, "url must be a valid absolute URL");
    }

    const link = await prisma.candidateLink.create({
      data: {
        candidateId: id,
        label,
        url,
      },
    });

    return jsonResponse(serializeLink(link), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
