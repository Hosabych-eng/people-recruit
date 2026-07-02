import * as XLSX from "xlsx";
import type { JobWithPipeline } from "@/types";
import { formatRelativeTimeUk } from "@/lib/format-relative-time";

function flattenPipelineCandidates(pipeline: JobWithPipeline) {
  return pipeline.stages.flatMap((stage) =>
    stage.candidates.map((candidate) => ({
      stage: stage.name,
      name: candidate.name,
      email: candidate.email ?? "",
      phone: candidate.phone ?? "",
      salary:
        candidate.expectedSalary != null
          ? `${candidate.expectedSalary} ${candidate.salaryCurrency ?? "USD"}`
          : "",
      resume: candidate.resumeLink ?? "",
      notes: candidate._count.candidateNotes,
      appliedAt: new Date(candidate.createdAt).toISOString(),
      appliedRelative: formatRelativeTimeUk(candidate.createdAt),
    })),
  );
}

export function exportPipelineToCsv(pipeline: JobWithPipeline) {
  const rows = flattenPipelineCandidates(pipeline);
  const headers = [
    "Етап",
    "Ім'я",
    "Email",
    "Телефон",
    "Зарплата",
    "Резюме",
    "Коментарі",
    "Дата подачі",
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
        row.stage,
        row.name,
        row.email,
        row.phone,
        row.salary,
        row.resume,
        row.notes,
        row.appliedAt,
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
  anchor.download = `${sanitizeFilename(pipeline.title)}_candidates.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportPipelineToXlsx(pipeline: JobWithPipeline) {
  const rows = flattenPipelineCandidates(pipeline);
  const sheet = XLSX.utils.json_to_sheet(
    rows.map((row) => ({
      Етап: row.stage,
      "Ім'я": row.name,
      Email: row.email,
      Телефон: row.phone,
      Зарплата: row.salary,
      Резюме: row.resume,
      Коментарі: row.notes,
      "Дата подачі": row.appliedAt,
      "Відносний час": row.appliedRelative,
    })),
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Кандидати");
  XLSX.writeFile(
    workbook,
    `${sanitizeFilename(pipeline.title)}_candidates.xlsx`,
  );
}

function sanitizeFilename(value: string) {
  return value.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_") || "pipeline";
}
