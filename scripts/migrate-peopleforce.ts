/**
 * Autonomous PeopleForce → PeopleRecruit migration.
 *
 * Does NOT run against live data unless you invoke it with a real
 * PEOPLEFORCE_API_KEY + DATABASE_URL. Safe to land in the repo and dry-run.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/migrate-peopleforce.ts --dry-run --limit=10
 *   npx tsx --env-file=.env scripts/migrate-peopleforce.ts
 *
 * See scripts/README-migration.md
 */

import { writeFileSync } from "fs";
import { resolve } from "path";
import type { ApplicationSource } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import {
  PeopleForceClient,
  type PeopleForceCandidate,
  type PeopleForcePipeline,
  type PeopleForceVacancy,
} from "../src/lib/peopleforce/client";
import { saveRemoteFileToStorage } from "../src/lib/file-storage";
import {
  getCandidateDocumentsBucket,
  getSupabasePublicUrl,
  isSupabaseStorageEnabled,
} from "../src/lib/supabase-storage";
import { syncCandidateApplication } from "../src/lib/settings/defaults";

const PAGE_DELAY_MS = 250;
const ERRORS_FILE = resolve(process.cwd(), "migration-errors.json");

type CliOptions = {
  dryRun: boolean;
  limit: number | null;
};

type MigrationError = {
  at: string;
  peopleforceCandidateId?: number;
  message: string;
};

type MigrationStats = {
  vacanciesFetched: number;
  jobsCreated: number;
  jobsMatched: number;
  candidatesFetched: number;
  candidatesCreated: number;
  candidatesUpdated: number;
  candidatesSkipped: number;
  resumesUploaded: number;
  errors: MigrationError[];
};

function parseArgs(argv: string[]): CliOptions {
  let dryRun = false;
  let limit: number | null = null;

  for (const arg of argv) {
    if (arg === "--dry-run") dryRun = true;
    const limitMatch = arg.match(/^--limit=(\d+)$/);
    if (limitMatch) limit = Number(limitMatch[1]);
  }

  return { dryRun, limit };
}

function loadDotEnvIfPresent() {
  // Prefer `npx tsx --env-file=.env …`. Fallback for plain `tsx` invocation.
  if (process.env.PEOPLEFORCE_API_KEY || process.env.DATABASE_URL) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    const envPath = resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) return;

    for (const raw of fs.readFileSync(envPath, "utf8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // ignore — env may already be injected
  }
}

function normalizePhone(
  phoneNumbers?: { number?: string }[] | string[] | null,
): string | null {
  if (!phoneNumbers?.length) return null;
  const first = phoneNumbers[0];
  if (typeof first === "string") return first.trim() || null;
  return first?.number?.trim() || null;
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function resolveResumeUrl(candidate: PeopleForceCandidate): string | null {
  const flat = candidate.resume_url?.trim();
  if (flat) return flat;
  const nested = candidate.resume?.url?.trim();
  return nested || null;
}

function resolveResumeFileName(candidate: PeopleForceCandidate): string {
  return (
    candidate.resume?.file_name?.trim() ||
    `peopleforce-resume-${candidate.id}.pdf`
  );
}

function resolveVacancyTitle(
  candidate: PeopleForceCandidate,
  vacanciesById: Map<number, PeopleForceVacancy>,
): string {
  const fromNested =
    candidate.vacancy?.title?.trim() || candidate.job?.title?.trim();
  if (fromNested) return fromNested;

  const vacancyId = candidate.vacancy_id ?? candidate.vacancy?.id ?? candidate.job?.id;
  if (vacancyId != null) {
    const vacancy = vacanciesById.get(Number(vacancyId));
    if (vacancy?.title) return vacancy.title;
  }

  return "PeopleForce import";
}

async function ensureJob(
  prisma: PrismaClient,
  title: string,
  vacancy: PeopleForceVacancy | undefined,
  pipeline: PeopleForcePipeline | undefined,
  dryRun: boolean,
  stats: MigrationStats,
) {
  const existing = await prisma.job.findFirst({
    where: { title },
    include: { stages: { orderBy: { orderInPipeline: "asc" } } },
  });

  if (existing) {
    stats.jobsMatched += 1;
    return existing;
  }

  stats.jobsCreated += 1;
  if (dryRun) {
    return null;
  }

  const stageNames =
    pipeline?.stages
      ?.slice()
      .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
      .map((stage) => stage.name) ?? [
      "New candidate",
      "Screening",
      "Interview",
      "Offered",
      "Hired",
      "Rejected",
    ];

  return prisma.job.create({
    data: {
      title,
      description: vacancy?.description?.trim() || title,
      status: vacancy?.state === "opened" ? "OPEN" : "DRAFT",
      openedAt: vacancy?.state === "opened" ? new Date() : undefined,
      stages: {
        create: stageNames.map((name, index) => ({
          name,
          orderInPipeline: index,
        })),
      },
    },
    include: { stages: { orderBy: { orderInPipeline: "asc" } } },
  });
}

async function findExistingCandidate(
  prisma: PrismaClient,
  email: string | null | undefined,
  name: string,
) {
  if (email?.trim()) {
    const byEmail = await prisma.candidate.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" } },
      include: {
        documents: { where: { category: "RESUME" }, take: 1 },
        stage: true,
      },
    });
    if (byEmail) return byEmail;
  }

  return prisma.candidate.findFirst({
    where: { name: { equals: name.trim(), mode: "insensitive" } },
    include: {
      documents: { where: { category: "RESUME" }, take: 1 },
      stage: true,
    },
  });
}

async function uploadResume(input: {
  apiKey: string;
  resumeUrl: string;
  fileName: string;
  mimeType?: string | null;
  candidateId: string;
  dryRun: boolean;
}): Promise<{ filePath: string; publicUrl: string | null; fileName: string; mimeType: string; fileSize: number } | null> {
  if (input.dryRun) {
    return {
      filePath: `dry-run/${input.candidateId}/${input.fileName}`,
      publicUrl: null,
      fileName: input.fileName,
      mimeType: input.mimeType ?? "application/pdf",
      fileSize: 0,
    };
  }

  const saved = await saveRemoteFileToStorage("candidate-documents", {
    url: input.resumeUrl,
    fileName: input.fileName,
    mimeType: input.mimeType ?? "application/pdf",
    headers: { "X-API-KEY": input.apiKey },
    candidateId: input.candidateId,
  });

  const publicUrl = isSupabaseStorageEnabled()
    ? getSupabasePublicUrl(getCandidateDocumentsBucket(), saved.filePath)
    : null;

  return {
    filePath: saved.filePath,
    publicUrl,
    fileName: saved.fileName,
    mimeType: saved.mimeType,
    fileSize: saved.fileSize,
  };
}

async function migrateCandidate(input: {
  prisma: PrismaClient;
  client: PeopleForceClient;
  apiKey: string;
  listItem: PeopleForceCandidate;
  vacanciesById: Map<number, PeopleForceVacancy>;
  pipelines: PeopleForcePipeline[];
  dryRun: boolean;
  stats: MigrationStats;
  index: number;
  total: number;
}) {
  const { prisma, client, apiKey, listItem, dryRun, stats } = input;
  const label = `[${input.index + 1}/${input.total}] PF#${listItem.id}`;

  let details: PeopleForceCandidate = listItem;
  try {
    details = await client.getCandidate(listItem.id);
  } catch (error) {
    stats.errors.push({
      at: new Date().toISOString(),
      peopleforceCandidateId: listItem.id,
      message: `getCandidate failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    // Fall back to list payload
  }

  const name =
    details.full_name?.trim() ||
    listItem.full_name?.trim() ||
    `PeopleForce candidate ${listItem.id}`;
  const email = details.email?.trim() || listItem.email?.trim() || null;
  const phone = normalizePhone(details.phone_numbers ?? listItem.phone_numbers);
  const resumeUrl = resolveResumeUrl(details) ?? resolveResumeUrl(listItem);
  const jobTitle = resolveVacancyTitle(details, input.vacanciesById);

  console.log(
    `${label} ${name}${email ? ` <${email}>` : ""} → job «${jobTitle}»${resumeUrl ? " +CV" : ""}`,
  );

  const vacancyId =
    details.vacancy_id ?? details.vacancy?.id ?? details.job?.id ?? listItem.vacancy_id;
  const vacancy =
    vacancyId != null ? input.vacanciesById.get(Number(vacancyId)) : undefined;
  const pipeline =
    vacancy?.pipeline_id != null
      ? input.pipelines.find((p) => String(p.id) === String(vacancy.pipeline_id))
      : input.pipelines[0];

  const job = await ensureJob(
    prisma,
    jobTitle,
    vacancy,
    pipeline,
    dryRun,
    stats,
  );

  if (!job) {
    // dry-run with new job — nothing else to persist
    if (resumeUrl) stats.resumesUploaded += 1;
    stats.candidatesCreated += 1;
    return;
  }

  const existing = await findExistingCandidate(prisma, email, name);

  if (existing) {
    // Idempotent: update missing resume / link; never create a duplicate
    if (!resumeUrl) {
      console.log(`${label} skip (exists, no resume_url)`);
      stats.candidatesSkipped += 1;
      return;
    }

    const hasResumeDoc = existing.documents.length > 0;
    const hasDurableLink =
      Boolean(existing.resumeLink) &&
      !existing.resumeLink!.startsWith("peopleforce://");

    if (hasResumeDoc && hasDurableLink) {
      console.log(`${label} skip (exists, resume already stored)`);
      stats.candidatesSkipped += 1;
      return;
    }

    if (dryRun) {
      console.log(`${label} would update resume on existing candidate ${existing.id}`);
      stats.candidatesUpdated += 1;
      stats.resumesUploaded += 1;
      return;
    }

    try {
      const uploaded = await uploadResume({
        apiKey,
        resumeUrl,
        fileName: resolveResumeFileName(details),
        mimeType: details.resume?.content_type,
        candidateId: existing.id,
        dryRun: false,
      });

      if (uploaded) {
        if (!hasResumeDoc) {
          await prisma.candidateDocument.create({
            data: {
              candidateId: existing.id,
              category: "RESUME",
              title: "Resume (PeopleForce)",
              fileName: uploaded.fileName,
              filePath: uploaded.filePath,
              mimeType: uploaded.mimeType,
              fileSize: uploaded.fileSize,
              uploadedByName: "PeopleForce Migration",
            },
          });
        }

        const durableUrl =
          uploaded.publicUrl ??
          existing.resumeLink ??
          `storage://${uploaded.filePath}`;

        await prisma.candidate.update({
          where: { id: existing.id },
          data: {
            resumeLink: durableUrl,
            phone: existing.phone ?? phone,
            email: existing.email ?? email,
          },
        });

        stats.resumesUploaded += 1;
        stats.candidatesUpdated += 1;
        console.log(`${label} updated resume → ${durableUrl}`);
      }
    } catch (error) {
      stats.errors.push({
        at: new Date().toISOString(),
        peopleforceCandidateId: listItem.id,
        message: `Resume update failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
    return;
  }

  // Create new candidate
  if (dryRun) {
    console.log(`${label} would create candidate`);
    stats.candidatesCreated += 1;
    if (resumeUrl) stats.resumesUploaded += 1;
    return;
  }

  const stage = job.stages[0];
  if (!stage) {
    stats.errors.push({
      at: new Date().toISOString(),
      peopleforceCandidateId: listItem.id,
      message: `Job ${job.id} has no stages`,
    });
    return;
  }

  const candidate = await prisma.candidate.create({
    data: {
      name,
      email,
      phone,
      resumeLink: resumeUrl ? `peopleforce://candidate/${listItem.id}` : null,
      coverLetter: details.cover_letter ?? null,
      expectedSalary: details.desired_salary ?? null,
      salaryCurrency: details.desired_salary_currency ?? "USD",
      applicationSource: "MANUAL" as ApplicationSource,
      jobId: job.id,
      stageId: stage.id,
    },
  });

  await syncCandidateApplication(candidate.id, job.id, stage.id);
  stats.candidatesCreated += 1;

  if (!resumeUrl) {
    console.log(`${label} created ${candidate.id} (no resume)`);
    return;
  }

  try {
    const uploaded = await uploadResume({
      apiKey,
      resumeUrl,
      fileName: resolveResumeFileName(details),
      mimeType: details.resume?.content_type,
      candidateId: candidate.id,
      dryRun: false,
    });

    if (uploaded) {
      await prisma.candidateDocument.create({
        data: {
          candidateId: candidate.id,
          category: "RESUME",
          title: "Resume (PeopleForce)",
          fileName: uploaded.fileName,
          filePath: uploaded.filePath,
          mimeType: uploaded.mimeType,
          fileSize: uploaded.fileSize,
          uploadedByName: "PeopleForce Migration",
        },
      });

      const durableUrl =
        uploaded.publicUrl ?? `storage://${uploaded.filePath}`;

      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { resumeLink: durableUrl },
      });

      stats.resumesUploaded += 1;
      console.log(`${label} created ${candidate.id} + resume → ${durableUrl}`);
    }
  } catch (error) {
    stats.errors.push({
      at: new Date().toISOString(),
      peopleforceCandidateId: listItem.id,
      message: `Resume upload failed for new candidate ${candidate.id}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
    console.log(`${label} created ${candidate.id} (resume failed)`);
  }
}

async function main() {
  loadDotEnvIfPresent();
  const options = parseArgs(process.argv.slice(2));

  const apiKey = process.env.PEOPLEFORCE_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      "Missing PEOPLEFORCE_API_KEY. Set it in .env (see scripts/README-migration.md).",
    );
    console.error(
      "This script was not run against live data. Exiting without changes.",
    );
    process.exitCode = 1;
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL.");
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  const client = new PeopleForceClient(apiKey);
  const stats: MigrationStats = {
    vacanciesFetched: 0,
    jobsCreated: 0,
    jobsMatched: 0,
    candidatesFetched: 0,
    candidatesCreated: 0,
    candidatesUpdated: 0,
    candidatesSkipped: 0,
    resumesUploaded: 0,
    errors: [],
  };

  console.log(
    `PeopleForce migration starting (dryRun=${options.dryRun}, limit=${options.limit ?? "∞"}, delay=${PAGE_DELAY_MS}ms)`,
  );

  try {
    const [vacancies, pipelines] = await Promise.all([
      client.listVacancies({ delayMs: PAGE_DELAY_MS }),
      client.listPipelines({ delayMs: PAGE_DELAY_MS }),
    ]);
    stats.vacanciesFetched = vacancies.length;
    console.log(`Fetched ${vacancies.length} vacancies, ${pipelines.length} pipelines`);

    const vacanciesById = new Map(vacancies.map((v) => [v.id, v]));

    const candidates = await client.listCandidates({
      delayMs: PAGE_DELAY_MS,
      maxItems: options.limit ?? undefined,
    });
    stats.candidatesFetched = candidates.length;
    console.log(`Fetched ${candidates.length} candidates`);

    // Deduplicate list by email/name within this run
    const seenKeys = new Set<string>();

    for (let index = 0; index < candidates.length; index += 1) {
      const item = candidates[index];
      const keyEmail = item.email?.trim().toLowerCase();
      const keyName = item.full_name ? normalizeName(item.full_name) : "";
      const dedupeKey = keyEmail ? `email:${keyEmail}` : `name:${keyName}:pf:${item.id}`;

      if (seenKeys.has(dedupeKey) && keyEmail) {
        console.log(`[${index + 1}/${candidates.length}] PF#${item.id} skip (duplicate in batch)`);
        stats.candidatesSkipped += 1;
        continue;
      }
      seenKeys.add(dedupeKey);

      try {
        await migrateCandidate({
          prisma,
          client,
          apiKey,
          listItem: item,
          vacanciesById,
          pipelines,
          dryRun: options.dryRun,
          stats,
          index,
          total: candidates.length,
        });
      } catch (error) {
        stats.errors.push({
          at: new Date().toISOString(),
          peopleforceCandidateId: item.id,
          message: error instanceof Error ? error.message : String(error),
        });
        console.error(
          `[${index + 1}/${candidates.length}] PF#${item.id} ERROR:`,
          error instanceof Error ? error.message : error,
        );
      }

      // Pace detail + download calls
      await new Promise((resolve) => setTimeout(resolve, PAGE_DELAY_MS));
    }
  } finally {
    writeFileSync(ERRORS_FILE, JSON.stringify(stats.errors, null, 2), "utf8");
    await prisma.$disconnect();
  }

  console.log("\n── Migration summary ──");
  console.log(JSON.stringify({ ...stats, errors: stats.errors.length }, null, 2));
  console.log(`Errors written to ${ERRORS_FILE}`);
  if (options.dryRun) {
    console.log("Dry run — no durable writes were intended (job/candidate creates skipped).");
  }
}

main().catch((error) => {
  console.error("Fatal:", error);
  writeFileSync(
    ERRORS_FILE,
    JSON.stringify(
      [{ at: new Date().toISOString(), message: error instanceof Error ? error.message : String(error) }],
      null,
      2,
    ),
    "utf8",
  );
  process.exitCode = 1;
});
