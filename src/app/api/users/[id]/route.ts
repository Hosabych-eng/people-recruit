import prisma from "@/lib/prisma";
import { requireAdminUser } from "@/lib/auth/server";
import {
  ApiError,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import { UserRole } from "@prisma/client";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const USER_ROLES = new Set<string>(Object.values(UserRole));

function parseRole(value: unknown): UserRole | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !USER_ROLES.has(value)) {
    throw new ApiError(400, "role must be ADMIN or RECRUITER");
  }
  return value as UserRole;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireAdminUser();
    const { id } = await context.params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, "User not found");
    }

    const body = await parseJsonBody<{
      name?: unknown;
      role?: unknown;
    }>(request);

    const updates: {
      name?: string;
      role?: UserRole;
    } = {};

    if ("name" in body) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        throw new ApiError(400, "name is required");
      }
      updates.name = body.name.trim();
    }

    if ("role" in body) {
      const role = parseRole(body.role);
      if (!role) {
        throw new ApiError(400, "role is required");
      }
      if (session.id === id && role !== "ADMIN") {
        throw new ApiError(400, "You cannot remove your own admin access");
      }
      updates.role = role;
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiError(400, "At least one field must be provided for update");
    }

    const user = await prisma.user.update({
      where: { id },
      data: updates,
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

    return jsonResponse(user);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireAdminUser();
    const { id } = await context.params;

    if (session.id === id) {
      throw new ApiError(400, "You cannot delete your own account");
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, "User not found");
    }

    if (existing.role === "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN", status: "ACTIVE" },
      });
      if (adminCount <= 1) {
        throw new ApiError(400, "Cannot delete the last administrator");
      }
    }

    await prisma.user.delete({ where: { id } });

    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
