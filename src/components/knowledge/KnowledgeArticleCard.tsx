import type { KnowledgeArticle } from "@/types";

type KnowledgeArticleCardProps = {
  article: KnowledgeArticle;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function previewContent(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > 180
    ? `${normalized.slice(0, 180)}…`
    : normalized;
}

export function KnowledgeArticleCard({ article }: KnowledgeArticleCardProps) {
  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground sm:text-lg">
          {article.title}
        </h2>
        <time
          dateTime={article.createdAt}
          className="shrink-0 text-xs font-medium text-muted"
        >
          {formatDate(article.createdAt)}
        </time>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted">
        {previewContent(article.content)}
      </p>

      <p className="mt-4 text-xs text-muted">
        Added by <span className="font-medium text-foreground">{article.authorName}</span>
      </p>
    </article>
  );
}
