import type { CandidateFieldType } from "@prisma/client";
import type { CandidateProfile } from "@/types";
import prisma from "@/lib/prisma";
import { getSourceLabel } from "@/lib/application-sources";
import type { ApplicationSource } from "@prisma/client";

export type CandidateFieldSchemaItem = {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: CandidateFieldType;
  visible: boolean;
  sortOrder: number;
  options: string[];
  isCustom: boolean;
};

export const DEFAULT_STANDARD_FIELDS: {
  fieldKey: string;
  label: string;
  sortOrder: number;
}[] = [
  { fieldKey: "id", label: "ID", sortOrder: 0 },
  { fieldKey: "name", label: "Ім'я", sortOrder: 1 },
  { fieldKey: "email", label: "Email", sortOrder: 2 },
  { fieldKey: "phone", label: "Телефон", sortOrder: 3 },
  { fieldKey: "position", label: "Позиція", sortOrder: 4 },
  { fieldKey: "source", label: "Джерело", sortOrder: 5 },
  { fieldKey: "englishLevel", label: "Англійська", sortOrder: 6 },
  { fieldKey: "chineseLevel", label: "Китайська", sortOrder: 7 },
  { fieldKey: "salary", label: "Зарплата", sortOrder: 8 },
  { fieldKey: "coverLetter", label: "Супровідний лист", sortOrder: 9 },
];

export function parseFieldOptions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function serializeFieldDefinition(field: {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: CandidateFieldType;
  visible: boolean;
  sortOrder: number;
  options: string | null;
  isCustom: boolean;
}): CandidateFieldSchemaItem {
  return {
    id: field.id,
    fieldKey: field.fieldKey,
    label: field.label,
    fieldType: field.fieldType,
    visible: field.visible,
    sortOrder: field.sortOrder,
    options: parseFieldOptions(field.options),
    isCustom: field.isCustom,
  };
}

export async function ensureDefaultCandidateFields() {
  for (const field of DEFAULT_STANDARD_FIELDS) {
    await prisma.candidateFieldDefinition.upsert({
      where: { fieldKey: field.fieldKey },
      update: {},
      create: {
        fieldKey: field.fieldKey,
        label: field.label,
        sortOrder: field.sortOrder,
        fieldType: "STANDARD",
        isCustom: false,
        visible: true,
      },
    });
  }
}

export async function getVisibleCandidateFieldSchema() {
  await ensureDefaultCandidateFields();
  const fields = await prisma.candidateFieldDefinition.findMany({
    where: { visible: true },
    orderBy: { sortOrder: "asc" },
  });
  return fields.map(serializeFieldDefinition);
}

export async function getAllCandidateFieldDefinitions() {
  await ensureDefaultCandidateFields();
  const fields = await prisma.candidateFieldDefinition.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return fields.map(serializeFieldDefinition);
}

export function getStandardFieldDisplayValue(
  profile: CandidateProfile,
  fieldKey: string,
): string {
  switch (fieldKey) {
    case "id":
      return profile.id.slice(0, 8);
    case "name":
      return profile.name;
    case "email":
      return profile.email ?? "—";
    case "phone":
      return profile.phone ?? "—";
    case "position":
      return profile.position ?? profile.job.title;
    case "source":
      return getSourceLabel(profile.applicationSource as ApplicationSource);
    case "englishLevel":
      return profile.englishLevel ?? "—";
    case "chineseLevel":
      return profile.chineseLevel ?? "—";
    case "salary":
      return profile.expectedSalary != null
        ? `${profile.expectedSalary} ${profile.salaryCurrency ?? "USD"}`
        : "—";
    default:
      return "—";
  }
}

export function slugifyFieldKey(label: string) {
  return `custom_${label
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04FF]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)}_${Date.now().toString(36)}`;
}
