import prisma from "@/lib/prisma";
import { getJobOrThrow } from "@/lib/api/helpers";
import { errorResponse, jsonResponse } from "@/lib/api/response";
import { requireQueryParam } from "@/lib/api/validation";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = requireQueryParam(searchParams, "jobId");

    await getJobOrThrow(jobId);

    const stages = await prisma.stage.findMany({
      where: { jobId },
      orderBy: { orderInPipeline: "asc" },
      include: {
        _count: {
          select: { candidates: true },
        },
      },
    });

    return jsonResponse(stages);
  } catch (error) {
    return errorResponse(error);
  }
}
