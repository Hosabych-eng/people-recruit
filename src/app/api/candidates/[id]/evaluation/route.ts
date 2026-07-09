import { getCandidateOrThrow } from "@/lib/api/helpers";
import { ApiError, errorResponse, jsonResponse, parseJsonBody } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import { getCandidateEvaluation, saveCandidateEvaluationScores } from "@/lib/evaluation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getCandidateOrThrow(id, session);
    const evaluation = await getCandidateEvaluation(id);
    return jsonResponse(evaluation);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getCandidateOrThrow(id, session);
    const body = await parseJsonBody<{
      scores?: { criterionId: string; score: number }[];
    }>(request);

    if (!body.scores || !Array.isArray(body.scores)) {
      throw new ApiError(400, "scores array is required");
    }

    const result = await saveCandidateEvaluationScores({
      candidateId: id,
      authorId: session.id,
      authorName: session.name,
      scores: body.scores,
    });

    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
