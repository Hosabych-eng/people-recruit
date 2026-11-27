import * as XLSX from "xlsx";
import type { CandidateWithRelations } from "@/types";
import { getSourceLabel } from "@/lib/application-sources";
import type { ApplicationSource } from "@prisma/client";

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCreatedDate(value: string | Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function tagsLabel(candidate: CandidateWithRelations) {
  return (candidate.tags ?? []).map((tag) => tag.name).join("; ");
}

function flattenCandidates(candidates: CandidateWithRelations[]) {
  return candidates.map((candidate) => ({
    name: candidate.name,
    email: candidate.email ?? "",
    phone: candidate.phone ?? "",
    job: candidate.job.title,
    stage: candidate.stage.name,
    source: getSourceLabel(candidate.applicationSource as ApplicationSource),
    resume: candidate.resumeLink ?? "",
    tags: tagsLabel(candidate),
    addedAt: formatDate(candidate.createdAt),
    createdDate: formatCreatedDate(candidate.createdAt),
  }));
}

function sanitizeFilename(value: string) {
  return value.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_") || "candidates";
}

/** RFC-style CSV escape; keeps Cyrillic intact for Excel/Sheets with UTF-8 BOM. */
function escapeCsvCell(value: string | number) {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function exportCandidatesToCsv(
  candidates: CandidateWithRelations[],
  filename = "candidates",
) {
  const rows = flattenCandidates(candidates);
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Current Job",
    "Stage",
    "Created Date",
    "Tags",
  ];

  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.name,
        row.email,
        row.phone,
        row.job,
        row.stage,
        row.createdDate,
        row.tags,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ];

  const blob = new Blob([`\uFEFF${lines.join("\n")}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${sanitizeFilename(filename)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportCandidatesToXlsx(
  candidates: CandidateWithRelations[],
  filename = "candidates",
) {
  const rows = flattenCandidates(candidates);
  const sheet = XLSX.utils.json_to_sheet(
    rows.map((row) => ({
      Name: row.name,
      Email: row.email,
      Phone: row.phone,
      "Current Job": row.job,
      Stage: row.stage,
      "Created Date": row.createdDate,
      Tags: row.tags,
      Source: row.source,
      Resume: row.resume,
    })),
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Candidates");
  XLSX.writeFile(workbook, `${sanitizeFilename(filename)}.xlsx`);
}
