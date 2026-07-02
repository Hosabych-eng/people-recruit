import prisma from "@/lib/prisma";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/constants";
import { requireStaffUser } from "@/lib/auth/server";
import { ApiError, errorResponse, jsonResponse, parseJsonBody } from "@/lib/api/response";
import { parseCreateJobBody } from "@/lib/api/validation";

export async function GET() {
  try {
    const jobs = await prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      include: {
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
    await requireStaffUser();

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const input = parseCreateJobBody(body);

    const job = await prisma.job.create({
      data: {
        title: input.title,
        description: input.description,
        status: input.status ?? "OPEN",
        location: input.location,
        employmentType: input.employmentType,
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
