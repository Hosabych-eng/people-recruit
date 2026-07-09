import prisma from "@/lib/prisma";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/constants";
import { requireAdminUser, requireSessionUser } from "@/lib/auth/server";
import { recruiterJobFilter } from "@/lib/auth/access";
import { ApiError, errorResponse, jsonResponse, parseJsonBody } from "@/lib/api/response";
import { parseCreateJobBody } from "@/lib/api/validation";

export async function GET() {
  try {
    const session = await requireSessionUser();

    const jobs = await prisma.job.findMany({
      where: recruiterJobFilter(session),
      orderBy: { createdAt: "desc" },
      include: {
        stages: { orderBy: { orderInPipeline: "asc" }, select: { id: true, name: true } },
        _count: {
          select: { candidates: true, stages: true },
        },
      },
    });

    return jsonResponse(jobs);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const input = parseCreateJobBody(body);

    const job = await prisma.job.create({
      data: {
        title: input.title,
        description: input.description,
        status: input.status ?? "OPEN",
        location: input.location,
        employmentType: input.employmentType,
        openedAt: input.status === "OPEN" || !input.status ? new Date() : undefined,
        stages: {
          create: DEFAULT_PIPELINE_STAGES.map((stage) => ({
            name: stage.name,
            orderInPipeline: stage.orderInPipeline,
          })),
        },
      },
      include: {
        stages: {
          orderBy: { orderInPipeline: "asc" },
        },
      },
    });

    return jsonResponse(job, 201);
  } catch (error) {
    if (error instanceof ApiError) return errorResponse(error);
    return errorResponse(error);
  }
}
