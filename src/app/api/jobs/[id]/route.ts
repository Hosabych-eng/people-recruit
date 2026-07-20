import prisma from "@/lib/prisma";
import { getJobOrThrow } from "@/lib/api/helpers";
import { requireAdminUser, requireSessionUser } from "@/lib/auth/server";
import {
  ApiError,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import { parseUpdateJobBody } from "@/lib/api/validation";
import { noteHtmlIsEmpty, sanitizeNoteHtml } from "@/lib/note-html";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    const job = await getJobOrThrow(id, session);

    const jobWithCounts = await prisma.job.findUnique({
      where: { id: job.id },
      include: {
        recruiters: { select: { id: true } },
        stages: {
          orderBy: { orderInPipeline: "asc" },
          include: {
            _count: {
              select: { candidates: true },
            },
          },
        },
        _count: {
          select: { candidates: true },
        },
      },
    });

    return jsonResponse(jobWithCounts);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getJobOrThrow(id, session);

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const updates = parseUpdateJobBody(body);

  if (updates.description !== undefined) {
    const description = sanitizeNoteHtml(updates.description);
    updates.description = noteHtmlIsEmpty(description) ? "" : description;
  }

    const updateKeys = Object.keys(updates);
    const isStatusOnly = updateKeys.length === 1 && updateKeys[0] === "status";
    if (!isStatusOnly && session.role !== "ADMIN") {
      throw new ApiError(
        403,
        "Only admins can update vacancy fields other than status",
      );
    }

    const { recruiterIds, status, ...rest } = updates;

    const job = await prisma.job.update({
      where: { id },
      data: {
        ...rest,
        ...(recruiterIds
          ? {
              recruiters: {
                set: recruiterIds.map((id) => ({ id })),
              },
            }
          : {}),
        ...(status === "OPEN" ? { openedAt: new Date() } : {}),
      },
      include: {
        recruiters: { select: { id: true } },
        stages: {
          orderBy: { orderInPipeline: "asc" },
        },
      },
    });

    return jsonResponse(job);
  } catch (error) {
    if (error instanceof ApiError) return errorResponse(error);
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireAdminUser();
    const { id } = await context.params;
    await getJobOrThrow(id);

    await prisma.job.delete({ where: { id } });

    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
