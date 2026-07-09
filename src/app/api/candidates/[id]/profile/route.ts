import { requireSessionUser } from "@/lib/auth/server";
import { serializeCandidateProfile } from "@/lib/candidate-profile";
import { getCandidateProfile } from "@/lib/candidates/profile";
import { errorResponse, jsonResponse } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSessionUser();
    const { id } = await context.params;
    const profile = await getCandidateProfile(id, session);
    return jsonResponse(serializeCandidateProfile(profile));
  } catch (error) {
    return errorResponse(error);
  }
}
