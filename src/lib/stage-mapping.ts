const STAGE_ALIASES: Record<string, string[]> = {
  "new candidate": ["applied", "application", "new", "новий", "новий кандидат", "заявка"],
  screening: ["screening", "скринінг", "phone screen", "phone", "відбір"],
  interview: ["interview", "інтерв'ю", "інтервю", "technical", "технічне"],
  offered: ["offer", "offered", "офер", "пропозиція", "proposal"],
  hired: ["hired", "найнят", "найнятий", "accepted"],
  rejected: ["rejected", "відмова", "disqualified", "declined", "відхилен"],
  "test assignment": ["test", "тестове", "assignment", "завдання"],
  "test review": ["review", "перевірка", "test review"],
};

export function mapExternalStageName(
  externalName: string | undefined,
  localStages: { id: string; name: string; orderInPipeline: number }[],
) {
  if (!externalName?.trim()) {
    return localStages[0] ?? null;
  }

  const normalized = externalName.toLowerCase().trim();

  const exact = localStages.find(
    (stage) => stage.name.toLowerCase() === normalized,
  );
  if (exact) return exact;

  const partial = localStages.find(
    (stage) =>
      stage.name.toLowerCase().includes(normalized) ||
      normalized.includes(stage.name.toLowerCase()),
  );
  if (partial) return partial;

  for (const stage of localStages) {
    const key = stage.name.toLowerCase();
    const aliases = STAGE_ALIASES[key] ?? [];
    if (aliases.some((alias) => normalized.includes(alias) || alias.includes(normalized))) {
      return stage;
    }
  }

  for (const [canonical, aliases] of Object.entries(STAGE_ALIASES)) {
    if (aliases.some((alias) => normalized.includes(alias))) {
      const match = localStages.find((stage) => stage.name.toLowerCase() === canonical);
      if (match) return match;
      const fuzzy = localStages.find((stage) =>
        aliases.some((alias) => stage.name.toLowerCase().includes(alias)),
      );
      if (fuzzy) return fuzzy;
    }
  }

  return localStages[0] ?? null;
}

export function isOfferedStageName(stageName: string) {
  const normalized = stageName.toLowerCase();
  return normalized.includes("offer") || normalized.includes("офер") || normalized.includes("пропозиц");
}
