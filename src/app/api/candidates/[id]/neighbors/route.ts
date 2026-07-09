import { getCandidateOrThrow } from "@/lib/api/helpers";
import { errorResponse, jsonResponse } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import { recruiterCandidateFilter } from "@/lib/auth/access";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    const candidate = await getCandidateOrThrow(id, session);

    const ordered = await prisma.candidate.findMany({
      where: {
        ...recruiterCandidateFilter(session),
        jobId: candidate.jobId,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true },
    });

    const index = ordered.findIndex((row) => row.id === id);

    return jsonResponse({
      prevId: index > 0 ? ordered[index - 1]!.id : null,
      nextId: index >= 0 && index < ordered.length - 1 ? ordered[index + 1]!.id : null,
      position: index >= 0 ? index + 1 : null,
      total: ordered.length,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
