import { getAuthBaseUrl } from "@/lib/auth-url";

type AuthEnv = {
  nextAuthUrl: string;
  nextAuthSecret: string;
  googleClientId: string;
  googleClientSecret: string;
};

function readRequired(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function readGoogleClientId(): string | null {
  return (
    readRequired("GOOGLE_CLIENT_ID") ?? readRequired("AUTH_GOOGLE_ID")
  );
}

function readGoogleClientSecret(): string | null {
  return (
    readRequired("GOOGLE_CLIENT_SECRET") ?? readRequired("AUTH_GOOGLE_SECRET")
  );
}

export function getAuthEnv(): AuthEnv | null {
  const googleClientId = readGoogleClientId();
  const googleClientSecret = readGoogleClientSecret();
  const nextAuthSecret =
    readRequired("NEXTAUTH_SECRET") ?? readRequired("AUTH_SECRET");
  const nextAuthUrl = getAuthBaseUrl();

  if (!googleClientId || !googleClientSecret || !nextAuthSecret) {
    return null;
  }

  return {
    nextAuthUrl,
    nextAuthSecret,
    googleClientId,
    googleClientSecret,
  };
}

export function getAuthEnvIssues(): string[] {
  const issues: string[] = [];

  if (!readGoogleClientId()) {
    issues.push(
      "GOOGLE_CLIENT_ID (or AUTH_GOOGLE_ID) is missing or empty in .env",
    );
  }
  if (!readGoogleClientSecret()) {
    issues.push(
      "GOOGLE_CLIENT_SECRET (or AUTH_GOOGLE_SECRET) is missing or empty in .env",
    );
  }
  if (!readRequired("NEXTAUTH_SECRET") && !readRequired("AUTH_SECRET")) {
    issues.push("NEXTAUTH_SECRET (or AUTH_SECRET) is missing in .env");
  }

  if (process.env.NODE_ENV !== "production") {
    const nextAuthUrl =
      readRequired("NEXTAUTH_URL") ?? readRequired("NEXT_PUBLIC_APP_URL");
    if (!nextAuthUrl) {
      issues.push(
        "NEXTAUTH_URL is not set — it must match the port of `npm run dev` (e.g. http://localhost:3000)",
      );
    }
  }

  return issues;
}

export function assertAuthEnv(): AuthEnv {
  const env = getAuthEnv();
  if (!env) {
    throw new Error(getAuthEnvIssues().join("; "));
  }
  return env;
}
