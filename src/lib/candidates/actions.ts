"use server";

import prisma from "@/lib/prisma";
import { getCandidateOrThrow } from "@/lib/api/helpers";
import { ApiError } from "@/lib/api/response";
import { parseUpdateCandidateBody } from "@/lib/api/validation";
import { requireSessionUser } from "@/lib/auth/server";
import type { UpdateCandidateInput } from "@/types";

/**
 * Fields safe for atomic inline / blur-save edits.
 * Stage and vacancy moves stay on PATCH /api/candidates/[id]
 * (rejection flow, hired events, test-assignment automation).
 */
const INLINE_FIELD_KEYS = new Set([
  "name",
  "email",
  "phone",
  "position",
  "location",
  "telegram",
  "offerLink",
  "firstContactDate",
  "lastContactDate",
  "recruiterId",
  "englishLevel",
  "chineseLevel",
  "expectedSalary",
  "salaryCurrency",
  "coverLetter",
  "resumeLink",
  "score",
  "isNew",
]);

export type PartialUpdateResult =
  | { ok: true; candidateId: string; updatedKeys: string[] }
  | { ok: false; error: string };

/**
 * Server Action skeleton for atomic partial candidate updates.
 * Prefer this from InlineEditableField saves; keep stage changes on
 * `api.candidates.updateStage` / existing PATCH.
 */
export async function updateCandidatePartial(
  candidateId: string,
  patch: UpdateCandidateInput,
): Promise<PartialUpdateResult> {
  try {
    const session = await requireSessionUser();
    await getCandidateOrThrow(candidateId, session);

    const keys = Object.keys(patch);
    if (keys.length === 0) {
      return {
        ok: false,
        error: "At least one field must be provided for update",
      };
    }

    if ("stageId" in patch || "jobId" in patch) {
      return {
        ok: false,
        error: "Use the stage-change API for stageId/jobId updates",
      };
    }

    for (const key of keys) {
      if (!INLINE_FIELD_KEYS.has(key)) {
        return {
          ok: false,
          error: `Field not supported for partial update: ${key}`,
        };
      }
    }

    const updates = parseUpdateCandidateBody(
      patch as Record<string, unknown>,
    );

    if (updates.recruiterId) {
      const recruiter = await prisma.user.findFirst({
        where: { id: updates.recruiterId, status: "ACTIVE" },
        select: { id: true },
      });
      if (!recruiter) {
        return {
          ok: false,
          error: "recruiterId must reference an active user",
        };
      }
    }

    await prisma.candidate.update({
      where: { id: candidateId },
      data: updates,
    });

    return {
      ok: true,
      candidateId,
      updatedKeys: Object.keys(updates),
    };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Failed to update candidate";
    return { ok: false, error: message };
  }
}
