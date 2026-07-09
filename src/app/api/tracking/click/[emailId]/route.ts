import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ emailId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { emailId } = await context.params;
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(targetUrl);
    const parsed = new URL(decodedUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  try {
    await prisma.emailMessage.updateMany({
      where: { id: emailId, direction: "OUTBOUND" },
      data: { isClicked: true, clickedAt: new Date() },
    });
  } catch {
    // Tracking must not block redirect.
  }

  return NextResponse.redirect(decodedUrl, 302);
}
