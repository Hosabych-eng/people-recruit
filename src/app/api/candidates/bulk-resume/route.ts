import { ApiError, errorResponse, jsonResponse } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import { importBulkResumes } from "@/lib/candidates/bulk-resume-import";

export async function POST(request: Request) {
  try {
    const session = await requireSessionUser();
    const formData = await request.formData();
    const jobId = String(formData.get("jobId") ?? "").trim();
    const stageId = String(formData.get("stageId") ?? "").trim();
    const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

    if (!jobId || !stageId) {
      throw new ApiError(400, "jobId and stageId are required");
    }

    const result = await importBulkResumes({
      jobId,
      stageId,
      recruiterId: session.id,
      recruiterName: session.name,
      files,
    });

    return jsonResponse(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
