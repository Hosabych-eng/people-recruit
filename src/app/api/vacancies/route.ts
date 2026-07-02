import { JobStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { errorResponse, jsonResponse } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";

export async function GET() {
  try {
    await requireSessionUser();

    const jobs = await prisma.job.findMany({
      where: { status: JobStatus.OPEN },
      orderBy: { createdAt: "desc" },
      include: {
        stages: {
          orderBy: { orderInPipeline: "asc" },
          take: 1,
          select: { id: true },
        },
      },
    });

    const vacancies = jobs
      .filter((job) => job.stages.length > 0)
      .map((job) => ({
        id: job.id,
        title: job.title,
        stageId: job.stages[0].id,
      }));

    return jsonResponse(vacancies);
  } catch (error) {
    return errorResponse(error);
  }
}
