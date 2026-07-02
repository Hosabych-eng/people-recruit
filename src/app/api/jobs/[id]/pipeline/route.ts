import prisma from "@/lib/prisma";
import { getJobOrThrow } from "@/lib/api/helpers";
import { errorResponse, jsonResponse } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await getJobOrThrow(id);

    const pipeline = await prisma.job.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { orderInPipeline: "asc" },
          include: {
            candidates: {
              orderBy: { createdAt: "asc" },
              include: {
                _count: {
                  select: { candidateNotes: true },
                },
              },
            },
          },
        },
      },
    });

    return jsonResponse(pipeline);
  } catch (error) {
    return errorResponse(error);
  }
}
