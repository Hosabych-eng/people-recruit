import { errorResponse, jsonResponse } from "@/lib/api/response";
import {
  getTestAssignmentByToken,
  submitTestAssignmentByToken,
} from "@/lib/test-assignment-automation";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const assignment = await getTestAssignmentByToken(token);
    if (!assignment) {
      return errorResponse(new Error("Upload link not found"));
    }
    return jsonResponse(assignment);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");
    const submissionLink = String(formData.get("submissionLink") ?? "").trim();

    const assignment = await submitTestAssignmentByToken({
      token,
      file: file instanceof File && file.size > 0 ? file : null,
      submissionLink: submissionLink || null,
    });

    return jsonResponse({ success: true, assignmentId: assignment.id });
  } catch (error) {
    return errorResponse(error);
  }
}
