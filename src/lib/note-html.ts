/**
 * Lightweight HTML sanitizer for candidate notes (TipTap output).
 * Strips scripts/handlers; keeps formatting + safe media tags.
 */
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "span",
  "div",
]);

export function isProbablyHtml(content: string) {
  return /<\/?[a-z][\s\S]*>/i.test(content.trim());
}

export function noteHtmlIsEmpty(html: string) {
  const text = html
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, "")
    .trim();
  return text.length === 0 && !/<img\b/i.test(html);
}

export function sanitizeNoteHtml(html: string): string {
  let cleaned = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:text\/html/gi, "");

  cleaned = cleaned.replace(
    /<\/?([a-z0-9]+)(\s[^>]*)?>/gi,
    (match, tagName: string, attrs: string | undefined) => {
      const tag = tagName.toLowerCase();
      const isClosing = match.startsWith("</");
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (isClosing) return `</${tag}>`;

      if (tag === "a") {
        const href = extractAttr(attrs ?? "", "href");
        if (!href || !isSafeUrl(href)) return "<a>";
        return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">`;
      }

      if (tag === "img") {
        const src = extractAttr(attrs ?? "", "src");
        const alt = extractAttr(attrs ?? "", "alt") ?? "";
        if (!src || !isSafeUrl(src)) return "";
        return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" />`;
      }

      return `<${tag}>`;
    },
  );

  return cleaned.trim();
}

function extractAttr(attrs: string, name: string) {
  const match = attrs.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  if (!match) return null;
  return match[2] ?? match[3] ?? match[4] ?? null;
}

function isSafeUrl(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("/api/")) return true;
  try {
    const url = new URL(trimmed, "https://example.invalid");
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function escapeAttr(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
