import { getAuthEnvIssues } from "@/lib/auth-env";
import { jsonResponse } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET() {
  const issues = getAuthEnvIssues();

  return jsonResponse({
    configured: issues.length === 0,
    issues,
  });
}
