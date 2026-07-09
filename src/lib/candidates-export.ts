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

function flattenCandidates(candidates: CandidateWithRelations[]) {
  return candidates.map((candidate) => ({
    name: candidate.name,
    email: candidate.email ?? "",
    phone: candidate.phone ?? "",
    job: candidate.job.title,
    stage: candidate.stage.name,
    source: getSourceLabel(candidate.applicationSource as ApplicationSource),
    resume: candidate.resumeLink ?? "",
    addedAt: formatDate(candidate.createdAt),
  }));
}

function sanitizeFilename(value: string) {
  return value.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_") || "candidates";
}

export function exportCandidatesToCsv(
  candidates: CandidateWithRelations[],
  filename = "candidates",
) {
  const rows = flattenCandidates(candidates);
  const headers = [
    "Ім'я",
    "Email",
    "Телефон",
    "Вакансія",
    "Етап",
    "Джерело",
    "Профіль",
    "Додано",
  ];

  const escape = (value: string | number) => {
    const text = String(value);
    if (text.includes(",") || text.includes('"') || text.includes("\n")) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.name,
        row.email,
        row.phone,
        row.job,
        row.stage,
        row.source,
        row.resume,
        row.addedAt,
      ]
        .map(escape)
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
      "Ім'я": row.name,
      Email: row.email,
      Телефон: row.phone,
      Вакансія: row.job,
      Етап: row.stage,
      Джерело: row.source,
      Профіль: row.resume,
      Додано: row.addedAt,
    })),
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Кандидати");
  XLSX.writeFile(workbook, `${sanitizeFilename(filename)}.xlsx`);
}
