const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/;
const PROFILE_URL_PATTERN =
  /https?:\/\/(?:www\.)?(?:linkedin\.com\/in\/[^\s<>"']+|djinni\.co\/[^\s<>"']+)/gi;

export type ParsedCandidateImport = {
  name?: string;
  email?: string;
  phone?: string;
  resumeLink?: string;
  applicationSource?: "LINKEDIN" | "DJINNI" | "MANUAL";
};

function detectSourceFromUrl(url: string): ParsedCandidateImport["applicationSource"] {
  const lower = url.toLowerCase();
  if (lower.includes("linkedin.com")) return "LINKEDIN";
  if (lower.includes("djinni.co")) return "DJINNI";
  return "MANUAL";
}

function normalizeUrl(url: string) {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function extractNameFromText(text: string, email?: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (EMAIL_PATTERN.test(line)) continue;
    if (/^https?:\/\//i.test(line)) continue;
    if (line.length < 2 || line.length > 80) continue;
    if (/^[@#]/.test(line)) continue;
    return line;
  }

  if (email) {
    const localPart = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
    if (localPart) {
      return localPart
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }
  }

  return undefined;
}

export function parseCandidateImportInput(rawInput: string): ParsedCandidateImport {
  const trimmed = rawInput.trim();
  if (!trimmed) return {};

  const isLikelyUrl = /^https?:\/\//i.test(trimmed) || /^(www\.)?(linkedin|djinni)/i.test(trimmed);
  if (isLikelyUrl && !trimmed.includes("\n")) {
    const resumeLink = normalizeUrl(trimmed.split(/\s/)[0] ?? trimmed);
    return {
      resumeLink,
      applicationSource: detectSourceFromUrl(resumeLink),
    };
  }

  const emailMatch = trimmed.match(EMAIL_PATTERN);
  const email = emailMatch?.[0]?.toLowerCase();
  const phoneMatch = trimmed.match(PHONE_PATTERN);
  const profileMatches = [...trimmed.matchAll(PROFILE_URL_PATTERN)];
  const resumeLink = profileMatches[0]?.[0] ? normalizeUrl(profileMatches[0][0]) : undefined;

  return {
    name: extractNameFromText(trimmed, email),
    email,
    phone: phoneMatch?.[0]?.replace(/\s+/g, " ").trim(),
    resumeLink,
    applicationSource: resumeLink ? detectSourceFromUrl(resumeLink) : "MANUAL",
  };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeProfileUrl(url: string) {
  try {
    const parsed = new URL(normalizeUrl(url));
    parsed.hash = "";
    parsed.search = "";
    const pathname = parsed.pathname.replace(/\/$/, "");
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${pathname}`;
  } catch {
    return url.trim().toLowerCase();
  }
}
