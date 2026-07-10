import type { KnowledgeArticle } from "@/types";

/** Maps pipeline stage names to knowledge-base article title keywords. */
const STAGE_ARTICLE_KEYWORDS: Record<string, string[]> = {
  applied: ["New_Candidate", "новий кандидат", "заявка", "applied"],
  screening: ["Screening", "скринінг", "phone screen"],
  interview: ["Interview", "інтерв'ю", "інтервю", "technical interview"],
  "test assignment": ["Test_Assignment", "тестове", "test assignment"],
  offered: ["Offer_Process", "offer process", "офер", "пропозиція"],
  hired: ["Onboarding", "онбординг", "hired", "найнят"],
  rejected: ["Rejection", "відмова", "rejection reason"],
};

function normalizeStage(stageName: string) {
  return stageName.toLowerCase().trim();
}

function keywordsForStage(stageName: string): string[] {
  const normalized = normalizeStage(stageName);

  for (const [key, keywords] of Object.entries(STAGE_ARTICLE_KEYWORDS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return keywords;
    }
  }

  if (normalized.includes("offer")) return STAGE_ARTICLE_KEYWORDS.offered;
  if (normalized.includes("screen")) return STAGE_ARTICLE_KEYWORDS.screening;
  if (normalized.includes("interview")) return STAGE_ARTICLE_KEYWORDS.interview;
  if (normalized.includes("test")) return STAGE_ARTICLE_KEYWORDS["test assignment"];
  if (normalized.includes("reject")) return STAGE_ARTICLE_KEYWORDS.rejected;
  if (normalized.includes("hired")) return STAGE_ARTICLE_KEYWORDS.hired;

  return STAGE_ARTICLE_KEYWORDS.applied;
}

function articleMatchesKeywords(article: KnowledgeArticle, keywords: string[]) {
  const haystack = `${article.title} ${article.content}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

export function matchArticlesForStage(
  stageName: string,
  articles: KnowledgeArticle[],
): KnowledgeArticle[] {
  const keywords = keywordsForStage(stageName);
  const matched = articles.filter((article) =>
    articleMatchesKeywords(article, keywords),
  );

  if (matched.length > 0) return matched.slice(0, 5);

  return articles.slice(0, 3);
}

export function stageHelpLabel(stageName: string) {
  const normalized = normalizeStage(stageName);
  if (normalized.includes("offer")) return "Офер";
  if (normalized.includes("interview")) return "Інтерв'ю";
  if (normalized.includes("screen")) return "Скринінг";
  if (normalized.includes("test")) return "Тестове";
  if (normalized.includes("reject")) return "Відмова";
  if (normalized.includes("hired")) return "Найм";
  return stageName;
}
