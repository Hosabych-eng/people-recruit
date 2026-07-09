import { errorResponse, jsonResponse } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import { syncInboundGmailForUser } from "@/lib/google/gmail-inbound";

export async function POST() {
  try {
    const session = await requireSessionUser();
    const result = await syncInboundGmailForUser(session.id);
    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
