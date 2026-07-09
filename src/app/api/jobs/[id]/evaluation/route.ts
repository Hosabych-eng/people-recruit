import { getJobOrThrow } from "@/lib/api/helpers";
import { ApiError, errorResponse, jsonResponse, parseJsonBody } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import {
  getJobEvaluationCriteria,
  upsertJobEvaluationCriteria,
} from "@/lib/evaluation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getJobOrThrow(id, session);
    const criteria = await getJobEvaluationCriteria(id);
    return jsonResponse(criteria);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    await getJobOrThrow(id, session);
    const body = await parseJsonBody<{ criteria?: string[] }>(request);
    if (!body.criteria || !Array.isArray(body.criteria)) {
      throw new ApiError(400, "criteria array is required");
    }
    const criteria = await upsertJobEvaluationCriteria(id, body.criteria);
    return jsonResponse(criteria);
  } catch (error) {
    return errorResponse(error);
  }
}
