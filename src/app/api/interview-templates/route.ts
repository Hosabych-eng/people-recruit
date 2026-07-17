import prisma from "@/lib/prisma";
import { errorResponse, jsonResponse } from "@/lib/api/response";
import { requireSessionUser } from "@/lib/auth/server";
import { BUILTIN_INTERVIEW_EMAIL_TEMPLATES } from "@/lib/interview-invitation-templates";

/** Session-readable interview email templates (builtin + DB). */
export async function GET() {
  try {
    await requireSessionUser();

    const custom = await prisma.interviewTemplate.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        subject: true,
        body: true,
        durationMinutes: true,
      },
    });

    return jsonResponse({
      builtin: BUILTIN_INTERVIEW_EMAIL_TEMPLATES.map((item) => ({
        id: item.id,
        title: item.title,
        kind: "builtin" as const,
      })),
      custom: custom.map((item) => ({
        id: item.id,
        title: item.title,
        subject: item.subject,
        body: item.body,
        durationMinutes: item.durationMinutes,
        kind: "custom" as const,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
