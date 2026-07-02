import * as XLSX from "xlsx";
import type { AnalyticsResponse } from "@/types";

function formatExportDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatEventType(type: AnalyticsResponse["recentEvents"][number]["type"]) {
  switch (type) {
    case "RECRUITING_IN":
      return "New application";
    case "RECRUITING_OUT":
      return "Closed application";
    case "ONBOARDING":
      return "Onboarding";
    case "OFFBOARDING":
      return "Offboarding";
  }
}

export function exportAnalyticsToXlsx(data: AnalyticsResponse) {
  const workbook = XLSX.utils.book_new();

  const summaryRows = [
    ["People movement overview"],
    [
      "Period",
      `${formatExportDate(data.period.from)} – ${formatExportDate(data.period.to)}`,
    ],
    [],
    ["Metric", "Count", "Description"],
    ...data.categories
      .filter((category) => category.key !== "total")
      .map((category) => [
        category.label,
        data.summary[category.key],
        category.description,
      ]),
    ["Total events", data.summary.total, ""],
  ];

  const timelineRows = [
    ["Date", "New applications", "Closed applications", "Onboarded", "Offboarded", "Daily total"],
    ...data.timeline.map((point) => {
      const total =
        point.recruitingIn +
        point.recruitingOut +
        point.onboarding +
        point.offboarding;

      return [
        formatExportDate(point.date),
        point.recruitingIn,
        point.recruitingOut,
        point.onboarding,
        point.offboarding,
        total,
      ];
    }),
  ];

  const eventsRows = [
    ["Person", "Role", "Event type", "Date", "Note"],
    ...data.recentEvents.map((event) => [
      event.personName,
      event.jobTitle ?? "",
      formatEventType(event.type),
      formatExportDate(event.occurredAt),
      event.note ?? "",
    ]),
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(summaryRows),
    "Summary",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(timelineRows),
    "Daily activity",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(eventsRows),
    "Recent events",
  );

  const from = data.period.from.slice(0, 10);
  const to = data.period.to.slice(0, 10);
  XLSX.writeFile(workbook, `workforce-insights_${from}_${to}.xlsx`);
}
