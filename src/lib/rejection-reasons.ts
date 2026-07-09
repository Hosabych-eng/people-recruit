import prisma from "@/lib/prisma";
import { isRejectedStageName } from "@/lib/pipeline-utils";
import { ApiError } from "@/lib/api/response";
import { optionalString } from "@/lib/api/validation";

const DEFAULT_REJECTION_REASONS = [
  "Зарплата",
  "Hard Skills",
  "English",
  "Counter-offer",
  "Культура",
  "Не відповідає",
];

export async function ensureDefaultRejectionReasons() {
  const count = await prisma.rejectionReason.count();
  if (count > 0) return;

  await prisma.rejectionReason.createMany({
    data: DEFAULT_REJECTION_REASONS.map((name, index) => ({
      name,
      sortOrder: index,
    })),
    skipDuplicates: true,
  });
}

export async function resolveRejectionFieldsForStageChange(input: {
  body: Record<string, unknown>;
  targetStageName: string;
  currentRejectionReasonId: string | null;
}) {
  const extra: {
    rejectionReasonId?: string | null;
    rejectionNote?: string | null;
  } = {};

  if (isRejectedStageName(input.targetStageName)) {
    const rejectionReasonId = optionalString(input.body.rejectionReasonId);
    if (!rejectionReasonId) {
      throw new ApiError(400, "rejectionReasonId is required when moving to Rejected");
    }

    const reason = await prisma.rejectionReason.findUnique({
      where: { id: rejectionReasonId },
    });
    if (!reason) {
      throw new ApiError(400, "Invalid rejection reason");
    }

    extra.rejectionReasonId = rejectionReasonId;
    extra.rejectionNote =
      input.body.rejectionNote === null
        ? null
        : optionalString(input.body.rejectionNote) ?? null;
  } else if (input.currentRejectionReasonId) {
    extra.rejectionReasonId = null;
    extra.rejectionNote = null;
  }

  return extra;
}
