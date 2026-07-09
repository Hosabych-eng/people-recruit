import prisma from "@/lib/prisma";
import { getCandidateOrThrow } from "@/lib/api/helpers";
import { ApiError, errorResponse, jsonResponse } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import {
  sendTestAssignmentToCandidate,
} from "@/lib/test-assignment-automation";
import { serializeCandidateTestAssignment } from "@/lib/test-assignments";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getCandidateOrThrow(id, session);

    const assignments = await prisma.candidateTestAssignment.findMany({
      where: { candidateId: id },
      include: { template: true },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse(assignments.map(serializeCandidateTestAssignment));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getCandidateOrThrow(id, session);
    const body = (await request.json()) as { templateId?: string };
    const templateId = body.templateId?.trim();

    if (!templateId) {
      throw new ApiError(400, "templateId is required");
    }

    const updated = await sendTestAssignmentToCandidate({
      candidateId: id,
      templateId,
      sentById: session.id,
      sentByName: session.name,
      sentByEmail: session.email,
      withUploadLink: true,
    });

    return jsonResponse(serializeCandidateTestAssignment(updated), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
