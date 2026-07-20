import prisma from "@/lib/prisma";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/constants";
import { requireAdminUser, requireSessionUser } from "@/lib/auth/server";
import { recruiterJobFilter } from "@/lib/auth/access";
import { ApiError, errorResponse, jsonResponse, parseJsonBody } from "@/lib/api/response";
import { parseCreateJobBody } from "@/lib/api/validation";
import { noteHtmlIsEmpty, sanitizeNoteHtml } from "@/lib/note-html";

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
    const session = await requireAdminUser();

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const input = parseCreateJobBody(body);

    const recruiterIds = input.recruiterIds?.length
      ? input.recruiterIds
      : [session.id];

    const recruiters = await prisma.user.findMany({
      where: {
        id: { in: recruiterIds },
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (recruiters.length !== recruiterIds.length) {
      throw new ApiError(400, "One or more recruiters are invalid");
    }

    const description = sanitizeNoteHtml(input.description);
    if (noteHtmlIsEmpty(description)) {
      throw new ApiError(400, "description is required");
    }

    const stagesTemplate = input.pipelineId
      ? await prisma.stage.findMany({
          where: { jobId: input.pipelineId },
          orderBy: { orderInPipeline: "asc" },
          select: {
            name: true,
            orderInPipeline: true,
            automationEnabled: true,
          },
        })
      : DEFAULT_PIPELINE_STAGES.map((stage) => ({
          name: stage.name,
          orderInPipeline: stage.orderInPipeline,
          automationEnabled: false,
        }));

    if (stagesTemplate.length === 0) {
      throw new ApiError(400, "Hiring pipeline is not configured");
    }

    const job = await prisma.job.create({
      data: {
        title: input.title,
        description,
        status: input.status ?? "OPEN",
        location: input.location,
        employmentType: input.employmentType,
        openedAt: input.status === "OPEN" || !input.status ? new Date() : undefined,
        recruiters: { connect: recruiters.map((r) => ({ id: r.id })) },
        stages: {
          create: stagesTemplate.map((stage) => ({
            name: stage.name,
            orderInPipeline: stage.orderInPipeline,
            automationEnabled: stage.automationEnabled,
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
