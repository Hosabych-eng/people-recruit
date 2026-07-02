import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { requireAdminUser } from "@/lib/auth/server";
import {
  ApiError,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import { UserRole } from "@prisma/client";

const USER_ROLES = new Set<string>(Object.values(UserRole));

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function GET() {
  try {
    await requireAdminUser();

    const users = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        image: true,
        createdAt: true,
      },
    });

    return jsonResponse(users);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();

    const body = await parseJsonBody<{
      email?: unknown;
      role?: unknown;
    }>(request);

    if (typeof body.email !== "string" || !body.email.trim()) {
      throw new ApiError(400, "email is required");
    }

    const email = normalizeEmail(body.email);
    const role =
      typeof body.role === "string" && USER_ROLES.has(body.role)
        ? (body.role as UserRole)
        : UserRole.RECRUITER;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser?.status === "ACTIVE") {
      throw new ApiError(409, "User with this email is already active");
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.invitation.upsert({
      where: { email },
      create: {
        email,
        role,
        token: randomUUID(),
        expiresAt,
      },
      update: {
        role,
        token: randomUUID(),
        expiresAt,
        createdAt: new Date(),
      },
    });

    return jsonResponse(invitation, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
