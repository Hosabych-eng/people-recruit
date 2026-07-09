import prisma from "@/lib/prisma";
import { getJobOrThrow, validateStageBelongsToJob } from "@/lib/api/helpers";
import { findDuplicateCandidate } from "@/lib/candidates/duplicate-check";
import { analyzeCandidateResume, extractPdfText } from "@/lib/gemini/candidate-analysis";
import { saveUploadedFile } from "@/lib/file-storage";
import { saveCandidateSkills } from "@/lib/candidate-skills";
import { syncCandidateApplication } from "@/lib/settings/defaults";
import { logWorkforceEvent } from "@/lib/workforce-events";

const MAX_FILES = 20;

export type BulkResumeImportItem = {
  fileName: string;
  candidateId?: string;
  candidateName?: string;
  matchScore?: number;
  error?: string;
  skippedDuplicate?: boolean;
};

export type BulkResumeImportResult = {
  created: number;
  analyzed: number;
  skippedDuplicate: number;
  failed: number;
  items: BulkResumeImportItem[];
};

function nameFromPdfFileName(fileName: string) {
  return fileName
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function importBulkResumes(input: {
  jobId: string;
  stageId: string;
  recruiterId: string;
  recruiterName: string;
  files: File[];
}) {
  if (input.files.length === 0) {
    throw new Error("At least one PDF file is required");
  }
  if (input.files.length > MAX_FILES) {
    throw new Error(`Maximum ${MAX_FILES} PDF files allowed per batch`);
  }

  const job = await getJobOrThrow(input.jobId);
  await validateStageBelongsToJob(input.stageId, input.jobId);

  const result: BulkResumeImportResult = {
    created: 0,
    analyzed: 0,
    skippedDuplicate: 0,
    failed: 0,
    items: [],
  };

  for (const file of input.files) {
    const item: BulkResumeImportItem = { fileName: file.name };

    try {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        throw new Error("Only PDF files are supported");
      }

      const duplicate = await findDuplicateCandidate({
        resumeLink: `bulk-upload://${file.name}:${file.size}`,
      });
      if (duplicate) {
        item.skippedDuplicate = true;
        item.candidateId = duplicate.id;
        item.candidateName = duplicate.name;
        result.skippedDuplicate += 1;
        result.items.push(item);
        continue;
      }

      const candidateName = nameFromPdfFileName(file.name) || "New Candidate";
      const candidate = await prisma.candidate.create({
        data: {
          name: candidateName,
          email: null,
          resumeLink: `bulk-upload://${file.name}:${file.size}`,
          applicationSource: "MANUAL",
          recruiterId: input.recruiterId,
          jobId: input.jobId,
          stageId: input.stageId,
        },
      });

      const saved = await saveUploadedFile("candidate-documents", file, {
        candidateId: candidate.id,
      });

      await prisma.candidateDocument.create({
        data: {
          candidateId: candidate.id,
          category: "RESUME",
          title: "Resume",
          fileName: saved.fileName,
          filePath: saved.filePath,
          mimeType: saved.mimeType,
          fileSize: saved.fileSize,
          uploadedByName: input.recruiterName,
        },
      });

      await syncCandidateApplication(candidate.id, input.jobId, input.stageId);

      let matchScore: number | undefined;
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const resumeText = await extractPdfText(buffer);
        if (resumeText) {
          await prisma.candidate.update({
            where: { id: candidate.id },
            data: { resumeText: resumeText.slice(0, 100_000) },
          });
          const analysis = await analyzeCandidateResume({
            candidateName,
            job,
            resumeText,
          });
          matchScore = analysis.matchScore;
          await prisma.candidate.update({
            where: { id: candidate.id },
            data: { score: Math.max(0, Math.min(5, Math.round(analysis.matchScore / 20))) },
          });
          await saveCandidateSkills(candidate.id, analysis.skills);
          result.analyzed += 1;
        }
      } catch {
        // AI analysis is best-effort for bulk upload.
      }

      await logWorkforceEvent({
        type: "RECRUITING_IN",
        personName: candidate.name,
        jobTitle: job.title,
        candidateId: candidate.id,
        jobId: job.id,
        note: "Bulk resume upload",
      });

      item.candidateId = candidate.id;
      item.candidateName = candidate.name;
      item.matchScore = matchScore;
      result.created += 1;
      result.items.push(item);
    } catch (error) {
      item.error = error instanceof Error ? error.message : "Import failed";
      result.failed += 1;
      result.items.push(item);
    }
  }

  return result;
}
