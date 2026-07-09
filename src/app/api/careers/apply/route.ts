import prisma from "@/lib/prisma";
import {
  getJobOrThrow,
  validateStageBelongsToJob,
} from "@/lib/api/helpers";
import { ApiError, errorResponse, jsonResponse } from "@/lib/api/response";
import {
  assertDocumentMimeType,
  saveUploadedFile,
} from "@/lib/file-storage";
import {
  findNewCandidateStage,
  syncCandidateApplication,
} from "@/lib/settings/defaults";
import { logWorkforceEvent } from "@/lib/workforce-events";

function parseSalary(value: FormDataEntryValue | null) {
  if (!value || String(value).trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ApiError(400, "expectedSalary must be a non-negative integer");
  }
  return parsed;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const jobId = String(formData.get("jobId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim() || undefined;
    const coverLetter = String(formData.get("coverLetter") ?? "").trim() || undefined;
    const englishLevel = String(formData.get("englishLevel") ?? "").trim() || undefined;
    const chineseLevel = String(formData.get("chineseLevel") ?? "").trim() || undefined;
    const salaryCurrency = String(formData.get("salaryCurrency") ?? "USD").trim() || "USD";
    const expectedSalary = parseSalary(formData.get("expectedSalary"));
    const resumeFile = formData.get("resume");

    if (!jobId) throw new ApiError(400, "jobId is required");
    if (!name) throw new ApiError(400, "name is required");
    if (!email) throw new ApiError(400, "email is required");

    const job = await getJobOrThrow(jobId);
    if (job.status !== "OPEN") {
      throw new ApiError(400, "This job is not accepting applications");
    }

    const firstStage = await findNewCandidateStage(job.id);
    if (!firstStage) {
      throw new ApiError(400, "Job pipeline is not configured");
    }
    await validateStageBelongsToJob(firstStage.id, job.id);

    const candidate = await prisma.candidate.create({
      data: {
        name,
        email,
        phone,
        coverLetter,
        englishLevel,
        chineseLevel,
        expectedSalary,
        salaryCurrency,
        jobId: job.id,
        stageId: firstStage.id,
        recruiterId: job.recruiterId,
        applicationSource: "CAREERS",
        isNew: true,
      },
    });

    await syncCandidateApplication(candidate.id, job.id, firstStage.id);

    if (resumeFile instanceof File && resumeFile.size > 0) {
      assertDocumentMimeType(resumeFile.type || "application/pdf");
      const saved = await saveUploadedFile("candidate-documents", resumeFile, {
        candidateId: candidate.id,
      });
      await prisma.candidateDocument.create({
        data: {
          candidateId: candidate.id,
          category: "RESUME",
          title: "Резюме",
          fileName: saved.fileName,
          filePath: saved.filePath,
          mimeType: saved.mimeType,
          fileSize: saved.fileSize,
          uploadedByName: name,
        },
      });
    }

    await logWorkforceEvent({
      type: "RECRUITING_IN",
      personName: candidate.name,
      jobTitle: job.title,
      candidateId: candidate.id,
      jobId: job.id,
      note: "Careers application",
    });

    return jsonResponse({ success: true, candidateId: candidate.id }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
