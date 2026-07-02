import { getCandidateOrThrow } from "@/lib/api/helpers";
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
    await requireSessionUser();
    const { id } = await context.params;
    await getCandidateOrThrow(id);
    const profile = await getCandidateProfile(id);
    return jsonResponse(serializeCandidateProfile(profile));
  } catch (error) {
    return errorResponse(error);
  }
}
