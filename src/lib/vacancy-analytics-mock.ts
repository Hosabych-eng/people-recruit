import type { VacancyAnalyticsResponse } from "@/types";

/** Demo dataset mirroring the SnoopGame vacancy reports screenshot. */
export function getVacancyAnalyticsMock(
  jobId = "demo",
  jobTitle = "Trainee/Junior QA (Ukraine)",
): VacancyAnalyticsResponse {
  const from = new Date();
  from.setDate(from.getDate() - 29);
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setHours(23, 59, 59, 999);

  const candidatesBySource: VacancyAnalyticsResponse["candidatesBySource"] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const wave = Math.max(0, Math.round(3 + Math.sin(i / 4) * 2));
    candidatesBySource.push({
      date: key,
      DJINNI: wave > 0 ? Math.ceil(wave * 0.35) : 0,
      DOU: wave > 1 ? 1 : 0,
      LINKEDIN: wave > 2 ? 1 : 0,
      ROBOTA_UA: 0,
      SNOOPGAME: wave > 0 ? 1 : 0,
      MANUAL: wave > 1 ? 1 : 0,
      CAREER_SITE: wave > 0 ? Math.ceil(wave * 0.45) : 0,
    });
  }

  return {
    job: { id: jobId, title: jobTitle },
    period: { from: from.toISOString(), to: to.toISOString() },
    summary: {
      activeCandidates: 58,
      rejected: 0,
      interviews: 7,
      offersSent: 0,
      offersAccepted: 0,
      averageScore: 0,
      ratingsCount: 0,
    },
    candidatesBySource,
    funnel: [
      { stage: "New candidate", count: 58, efficiency: 100 },
      { stage: "Screening", count: 51, efficiency: 87.9 },
      { stage: "No answer", count: 50, efficiency: 86.2 },
      { stage: "Rejected", count: 47, efficiency: 81 },
      { stage: "HR Interview", count: 9, efficiency: 15.5 },
      { stage: "Rejected after HR Interview", count: 8, efficiency: 13.8 },
      { stage: "Test task", count: 3, efficiency: 5.2 },
      { stage: "Rejected after Test task", count: 3, efficiency: 5.2 },
      { stage: "Technical Interview", count: 2, efficiency: 3.4 },
      { stage: "Rejected after Technical Interview", count: 2, efficiency: 3.4 },
      { stage: "Sent Job Offer", count: 2, efficiency: 3.4 },
      { stage: "Rejected Job Offer", count: 1, efficiency: 1.7 },
      { stage: "Hired", count: 0, efficiency: 0 },
    ],
    compensation: {
      curve: [
        { salaryUsd: 40000, count: 1 },
        { salaryUsd: 45000, count: 2 },
        { salaryUsd: 50000, count: 4 },
        { salaryUsd: 55000, count: 8 },
        { salaryUsd: 60000, count: 12 },
        { salaryUsd: 65000, count: 10 },
        { salaryUsd: 70000, count: 7 },
        { salaryUsd: 75000, count: 4 },
        { salaryUsd: 80000, count: 2 },
        { salaryUsd: 85000, count: 1 },
      ],
      scatter: [
        { salaryUsd: 52000, density: 0.35 },
        { salaryUsd: 58000, density: 0.43 },
        { salaryUsd: 61000, density: 0.51 },
        { salaryUsd: 64000, density: 0.39 },
        { salaryUsd: 67000, density: 0.47 },
        { salaryUsd: 72000, density: 0.55 },
      ],
    },
    compensationSummary: {
      avgUsd: 62500,
      minUsd: 42000,
      maxUsd: 84000,
    },
    sourcesBreakdown: [
      { source: "DJINNI", label: "Djinni", count: 21, percentage: 36.84, color: "#6366f1" },
      { source: "DOU", label: "DOU", count: 1, percentage: 1.75, color: "#0ea5e9" },
      { source: "LINKEDIN", label: "Linkedin", count: 1, percentage: 1.75, color: "#0077b5" },
      { source: "ROBOTA_UA", label: "robota.ua", count: 1, percentage: 1.75, color: "#f59e0b" },
      { source: "SNOOPGAME", label: "snoopgame", count: 3, percentage: 5.26, color: "#8b5cf6" },
      { source: "MANUAL", label: "Додано вручну", count: 4, percentage: 7.02, color: "#ec4899" },
      { source: "CAREER_SITE", label: "Кар'єрний сайт", count: 27, percentage: 45.61, color: "#a78bfa" },
    ],
    emails: { sent: 142, received: 89 },
    sourceLegend: [
      { key: "DJINNI", label: "Djinni", color: "#6366f1" },
      { key: "DOU", label: "DOU", color: "#0ea5e9" },
      { key: "LINKEDIN", label: "Linkedin", color: "#0077b5" },
      { key: "ROBOTA_UA", label: "robota.ua", color: "#f59e0b" },
      { key: "SNOOPGAME", label: "snoopgame", color: "#8b5cf6" },
      { key: "MANUAL", label: "Додано вручну", color: "#ec4899" },
      { key: "CAREER_SITE", label: "Кар'єрний сайт", color: "#a78bfa" },
    ],
  };
}
