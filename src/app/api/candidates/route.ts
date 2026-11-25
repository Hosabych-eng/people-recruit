import prisma from "@/lib/prisma";
import {
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api/response";
import {
  optionalQueryParam,
  parseCreateCandidateBody,
} from "@/lib/api/validation";
import {
  getJobOrThrow,
  validateStageBelongsToJob,
} from "@/lib/api/helpers";
import { recruiterCandidateFilter } from "@/lib/auth/access";
import { requireSessionUser } from "@/lib/auth/server";
import {
  findDuplicateCandidate,
  getCandidateDuplicateHistory,
} from "@/lib/candidates/duplicate-check";
import { logWorkforceEvent } from "@/lib/workforce-events";
import { syncCandidateApplication } from "@/lib/settings/defaults";

const candidateListSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  resumeLink: true,
  avatarUrl: true,
  position: true,
  englishLevel: true,
  chineseLevel: true,
  expectedSalary: true,
  salaryCurrency: true,
  applicationSource: true,
  score: true,
  skills: true,
  evaluationAverage: true,
  emailsSent: true,
  emailsReceived: true,
  isNew: true,
  location: true,
  telegram: true,
  offerLink: true,
  firstContactDate: true,
  lastContactDate: true,
  stageId: true,
  jobId: true,
  recruiterId: true,
  rejectionReasonId: true,
  createdAt: true,
  updatedAt: true,
  stage: {
    select: {
      id: true,
      name: true,
      orderInPipeline: true,
      automationEnabled: true,
      jobId: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  job: {
    select: { id: true, title: true, status: true },
  },
  rejectionReason: { select: { id: true, name: true } },
  candidateNotes: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { content: true, createdAt: true },
  },
} as const;

export async function GET(request: Request) {
  try {
    const session = await requireSessionUser();

    const { searchParams } = new URL(request.url);
    const jobId = optionalQueryParam(searchParams, "jobId");
    const query = optionalQueryParam(searchParams, "q")?.trim();

    const candidates = await prisma.candidate.findMany({
      where: {
        ...recruiterCandidateFilter(session),
        ...(jobId ? { jobId } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
                { resumeLink: { contains: query, mode: "insensitive" } },
                { resumeText: { contains: query, mode: "insensitive" } },
                { skills: { has: query } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: candidateListSelect,
    });

    const serialized = candidates.map(({ candidateNotes, ...candidate }) => ({
      ...candidate,
      lastNote: candidateNotes[0] ?? null,
    }));

    return jsonResponse(serialized);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSessionUser();

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const input = parseCreateCandidateBody(body);

    const duplicate = await findDuplicateCandidate({
      email: input.email,
      phone: input.phone,
      resumeLink: input.resumeLink,
    });

    if (duplicate) {
      const history = await getCandidateDuplicateHistory(duplicate.id);
      return jsonResponse({
        isDuplicate: true,
        candidate: duplicate,
        history,
      });
    }

    const job = await getJobOrThrow(input.jobId, session);
    await validateStageBelongsToJob(input.stageId, input.jobId);

    const candidate = await prisma.candidate.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        resumeLink: input.resumeLink,
        expectedSalary: input.expectedSalary,
        salaryCurrency: input.salaryCurrency,
        jobId: input.jobId,
        stageId: input.stageId,
        recruiterId: session.id,
      },
      include: {
        stage: true,
        job: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    await Promise.all([
      syncCandidateApplication(candidate.id, input.jobId, input.stageId),
      logWorkforceEvent({
        type: "RECRUITING_IN",
        personName: candidate.name,
        jobTitle: job.title,
        candidateId: candidate.id,
        jobId: job.id,
      }),
    ]);

    return jsonResponse({ isDuplicate: false, candidate }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
