import type { ApplicationSource } from "@prisma/client";

export const APPLICATION_SOURCES: ApplicationSource[] = [
  "DJINNI",
  "DOU",
  "LINKEDIN",
  "ROBOTA_UA",
  "SNOOPGAME",
  "MANUAL",
  "CAREER_SITE",
  "CAREERS",
];

export const SOURCE_META: Record<
  ApplicationSource,
  { label: string; color: string }
> = {
  DJINNI: { label: "Djinni", color: "#6366f1" },
  DOU: { label: "DOU", color: "#0ea5e9" },
  LINKEDIN: { label: "Linkedin", color: "#0077b5" },
  ROBOTA_UA: { label: "robota.ua", color: "#f59e0b" },
  SNOOPGAME: { label: "snoopgame", color: "#8b5cf6" },
  MANUAL: { label: "Додано вручну", color: "#ec4899" },
  CAREER_SITE: { label: "Кар'єрний сайт", color: "#a78bfa" },
  CAREERS: { label: "Careers", color: "#14b8a6" },
};

export function getSourceLabel(source: ApplicationSource) {
  return SOURCE_META[source].label;
}

export function getSourceColor(source: ApplicationSource) {
  return SOURCE_META[source].color;
}
