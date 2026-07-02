const STAGE_TAG_RULES: { pattern: RegExp; tag: string }[] = [
  { pattern: /^(new candidate|applied|новий)/i, tag: "Новий кандидат" },
  { pattern: /screen/i, tag: "Скринінг" },
  { pattern: /interview|інтерв/i, tag: "Інтерв'ю" },
  { pattern: /offer|офер/i, tag: "Офер" },
  { pattern: /hired|найня/i, tag: "Найнятий" },
  { pattern: /reject|відхил/i, tag: "Відхилено" },
  { pattern: /no answer|немає відповіді/i, tag: "Немає відповіді" },
];

export function getStageSystemTag(stageName: string): string | null {
  for (const rule of STAGE_TAG_RULES) {
    if (rule.pattern.test(stageName.trim())) {
      return rule.tag;
    }
  }
  return null;
}

export function formatStageCountUk(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} стадія`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} стадії`;
  }

  return `${count} стадій`;
}
