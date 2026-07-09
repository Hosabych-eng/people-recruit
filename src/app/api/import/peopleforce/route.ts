import { ApiError, errorResponse, jsonResponse, parseJsonBody } from "@/lib/api/response";
import { requireAdminUser } from "@/lib/auth/server";
import { importFromPeopleForce } from "@/lib/candidates/peopleforce-import";

export async function POST(request: Request) {
  try {
    const session = await requireAdminUser();
    const body = await parseJsonBody<{
      apiToken?: string;
      dryRun?: boolean;
      vacancyIdOrUrl?: string;
    }>(request);

    const apiToken = body.apiToken?.trim();
    if (!apiToken) {
      throw new ApiError(400, "apiToken is required");
    }

    const result = await importFromPeopleForce({
      apiToken,
      recruiterId: session.id,
      dryRun: Boolean(body.dryRun),
      vacancyIdOrUrl: body.vacancyIdOrUrl?.trim() || undefined,
    });

    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
