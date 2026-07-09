import prisma from "@/lib/prisma";
import { transparentGifBuffer } from "@/lib/email-tracking";

type RouteContext = { params: Promise<{ emailId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { emailId } = await context.params;

  try {
    await prisma.emailMessage.updateMany({
      where: { id: emailId, direction: "OUTBOUND" },
      data: { isRead: true, openedAt: new Date() },
    });
  } catch {
    // Tracking must not fail for the recipient.
  }

  return new Response(transparentGifBuffer(), {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
