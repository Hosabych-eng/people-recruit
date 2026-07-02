import type { WorkforceEventType } from "@prisma/client";
import prisma from "@/lib/prisma";

type LogWorkforceEventInput = {
  type: WorkforceEventType;
  personName: string;
  jobTitle?: string;
  note?: string;
  occurredAt?: Date;
  candidateId?: string;
  jobId?: string;
};

export async function logWorkforceEvent(input: LogWorkforceEventInput) {
  return prisma.workforceEvent.create({
    data: {
      type: input.type,
      personName: input.personName,
      jobTitle: input.jobTitle,
      note: input.note,
      occurredAt: input.occurredAt ?? new Date(),
      candidateId: input.candidateId,
      jobId: input.jobId,
    },
  });
}

export const HIRED_STAGE_NAME = "Hired";
