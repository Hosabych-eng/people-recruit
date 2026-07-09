import type { ApplicationSource } from "@prisma/client";
import prisma from "@/lib/prisma";
import { findDuplicateCandidate } from "@/lib/candidates/duplicate-check";
import { saveRemoteFileToStorage } from "@/lib/file-storage";
import { logWorkforceEvent } from "@/lib/workforce-events";
import { syncCandidateApplication } from "@/lib/settings/defaults";
import {
  PeopleForceClient,
  type PeopleForceApplication,
  type PeopleForcePipeline,
  type PeopleForceVacancy,
} from "@/lib/peopleforce/client";
import { mapExternalStageName } from "@/lib/stage-mapping";

export type PeopleForceImportOptions = {
  apiToken: string;
  recruiterId?: string;
  dryRun?: boolean;
  vacancyIdOrUrl?: string;
};

export type PeopleForceImportResult = {
  jobsCreated: number;
  jobsMatched: number;
  candidatesCreated: number;
  candidatesSkippedDuplicate: number;
  resumesImported: number;
  notesImported: number;
  applicationsSynced: number;
  errors: string[];
};

function normalizePhone(phoneNumbers?: { number?: string }[] | string[]) {
  if (!phoneNumbers?.length) return null;
  const first = phoneNumbers[0];
  if (typeof first === "string") return first;
  return first?.number ?? null;
}

async function ensureJobForVacancy(
  vacancy: PeopleForceVacancy,
  pipeline: PeopleForcePipeline | undefined,
  recruiterId?: string,
) {
  const existing = await prisma.job.findFirst({
    where: { title: vacancy.title },
    include: { stages: { orderBy: { orderInPipeline: "asc" } } },
  });

  if (existing) {
    return { job: existing, created: false };
  }

  const stageNames =
    pipeline?.stages?.map((stage) => stage.name) ??
    ["New candidate", "Screening", "Interview", "Offered", "Hired", "Rejected"];

  const job = await prisma.job.create({
    data: {
      title: vacancy.title,
      description: vacancy.description?.trim() || vacancy.title,
      status: vacancy.state === "opened" ? "OPEN" : "DRAFT",
      recruiterId: recruiterId ?? null,
      openedAt: vacancy.state === "opened" ? new Date() : undefined,
      stages: {
        create: stageNames.map((name, index) => ({
          name,
          orderInPipeline: index,
        })),
      },
    },
    include: { stages: { orderBy: { orderInPipeline: "asc" } } },
  });

  return { job, created: true };
}

async function importResumeForCandidate(
  apiToken: string,
  candidateId: string,
  peopleforceCandidateId: number,
  client: PeopleForceClient,
  uploadedByName: string,
) {
  const details = await client.getCandidate(peopleforceCandidateId);
  const resumeUrl = details.resume?.url;
  if (!resumeUrl) return false;

  const saved = await saveRemoteFileToStorage("candidate-documents", {
    url: resumeUrl,
    fileName: details.resume?.file_name ?? `resume-${peopleforceCandidateId}.pdf`,
    mimeType: details.resume?.content_type ?? "application/pdf",
    headers: { "X-API-KEY": apiToken },
    candidateId,
  });

  await prisma.candidateDocument.create({
    data: {
      candidateId,
      category: "RESUME",
      title: "Resume (PeopleForce)",
      fileName: saved.fileName,
      filePath: saved.filePath,
      mimeType: saved.mimeType,
      fileSize: saved.fileSize,
      uploadedByName,
    },
  });

  return true;
}

async function importNotes(
  client: PeopleForceClient,
  peopleforceCandidateId: number,
  candidateId: string,
) {
  const notes = await client.listCandidateNotes(peopleforceCandidateId);
  let imported = 0;

  for (const note of notes) {
    const content = note.comment?.trim();
    if (!content) continue;

    const existing = await prisma.candidateNote.findFirst({
      where: { candidateId, content },
    });
    if (existing) continue;

    await prisma.candidateNote.create({
      data: {
        candidateId,
        content,
        authorName: note.author?.full_name ?? "PeopleForce",
        authorRole: "import",
      },
    });
    imported += 1;
  }

  return imported;
}

async function upsertCandidateFromApplication(input: {
  application: PeopleForceApplication;
  jobId: string;
  stages: { id: string; name: string; orderInPipeline: number }[];
  recruiterId?: string;
  client: PeopleForceClient;
  apiToken: string;
  dryRun: boolean;
  result: PeopleForceImportResult;
}) {
  const applicant = input.application.applicant;
  const email = applicant.email?.trim() || undefined;
  const resumeLink = email ? undefined : `peopleforce://candidate/${applicant.id}`;

  const duplicate = await findDuplicateCandidate({ email, resumeLink });
  if (duplicate) {
    input.result.candidatesSkippedDuplicate += 1;
    return duplicate.id;
  }

  const stage = mapExternalStageName(input.application.pipeline_state?.name, input.stages);
  if (!stage) {
    input.result.errors.push(
      `Vacancy application ${input.application.id}: no stages available`,
    );
    return null;
  }

  if (input.dryRun) {
    input.result.candidatesCreated += 1;
    return null;
  }

  const details = await input.client.getCandidate(applicant.id);
  const candidate = await prisma.candidate.create({
    data: {
      name: details.full_name ?? applicant.full_name ?? `Candidate ${applicant.id}`,
      email: details.email ?? email ?? null,
      phone: normalizePhone(details.phone_numbers ?? applicant.phone_numbers),
      resumeLink,
      coverLetter: details.cover_letter ?? null,
      expectedSalary: details.desired_salary ?? null,
      salaryCurrency: details.desired_salary_currency ?? "USD",
      applicationSource: "MANUAL" as ApplicationSource,
      recruiterId: input.recruiterId ?? null,
      jobId: input.jobId,
      stageId: stage.id,
    },
  });

  await syncCandidateApplication(candidate.id, input.jobId, stage.id);
  input.result.candidatesCreated += 1;
  input.result.applicationsSynced += 1;

  try {
    const importedResume = await importResumeForCandidate(
      input.apiToken,
      candidate.id,
      applicant.id,
      input.client,
      "PeopleForce Import",
    );
    if (importedResume) {
      input.result.resumesImported += 1;
    }
  } catch (error) {
    input.result.errors.push(
      `Resume import failed for candidate ${candidate.id}: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }

  try {
    input.result.notesImported += await importNotes(input.client, applicant.id, candidate.id);
  } catch (error) {
    input.result.errors.push(
      `Notes import failed for candidate ${candidate.id}: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }

  await logWorkforceEvent({
    type: "RECRUITING_IN",
    personName: candidate.name,
    jobTitle: (
      await prisma.job.findUnique({ where: { id: input.jobId }, select: { title: true } })
    )?.title,
    candidateId: candidate.id,
    jobId: input.jobId,
    note: "Imported from PeopleForce",
  });

  return candidate.id;
}

export async function importFromPeopleForce(
  options: PeopleForceImportOptions,
): Promise<PeopleForceImportResult> {
  const client = new PeopleForceClient(options.apiToken);
  const result: PeopleForceImportResult = {
    jobsCreated: 0,
    jobsMatched: 0,
    candidatesCreated: 0,
    candidatesSkippedDuplicate: 0,
    resumesImported: 0,
    notesImported: 0,
    applicationsSynced: 0,
    errors: [],
  };

  const [vacancies, pipelines] = await Promise.all([
    client.listVacancies(),
    client.listPipelines(),
  ]);

  const pipelineById = new Map(
    pipelines.map((pipeline) => [String(pipeline.id), pipeline]),
  );

  const vacancyFilter = options.vacancyIdOrUrl?.trim();
  const filteredVacancies = vacancyFilter
    ? vacancies.filter((vacancy) => {
        const idString = String(vacancy.id);
        return vacancyFilter === idString || vacancyFilter.includes(idString);
      })
    : vacancies;

  for (const vacancy of filteredVacancies) {
    try {
      const pipeline = vacancy.pipeline_id
        ? pipelineById.get(String(vacancy.pipeline_id))
        : pipelines[0];

      if (options.dryRun) {
        const existing = await prisma.job.findFirst({ where: { title: vacancy.title } });
        if (existing) result.jobsMatched += 1;
        else result.jobsCreated += 1;
        continue;
      }

      const { job, created } = await ensureJobForVacancy(
        vacancy,
        pipeline,
        options.recruiterId,
      );
      if (created) result.jobsCreated += 1;
      else result.jobsMatched += 1;

      const applications = await client.listVacancyApplications(vacancy.id);
      for (const application of applications) {
        try {
          await upsertCandidateFromApplication({
            application,
            jobId: job.id,
            stages: job.stages,
            recruiterId: options.recruiterId,
            client,
            apiToken: options.apiToken,
            dryRun: false,
            result,
          });
        } catch (error) {
          result.errors.push(
            `Application ${application.id}: ${
              error instanceof Error ? error.message : "import failed"
            }`,
          );
        }
      }
    } catch (error) {
      result.errors.push(
        `Vacancy ${vacancy.id}: ${error instanceof Error ? error.message : "import failed"}`,
      );
    }
  }

  return result;
}
