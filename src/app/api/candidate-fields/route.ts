import { errorResponse, jsonResponse } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import { getVisibleCandidateFieldSchema } from "@/lib/candidate-fields";

export async function GET() {
  try {
    await requireSessionUser();
    const fields = await getVisibleCandidateFieldSchema();
    return jsonResponse(fields);
  } catch (error) {
    return errorResponse(error);
  }
}
