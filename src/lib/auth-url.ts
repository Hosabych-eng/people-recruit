/** Canonical OAuth callback host — must match Google Console redirect URI. */
export const PRODUCTION_AUTH_URL = "https://people-recruit.vercel.app";

/**
 * Pin NEXTAUTH_URL before NextAuth reads headers on Vercel preview deployments.
 * Runs at module load; safe to import from route handlers and auth config.
 */
export function pinProductionAuthUrl() {
  if (process.env.NODE_ENV === "production") {
    process.env.NEXTAUTH_URL = PRODUCTION_AUTH_URL;
    process.env.AUTH_URL = PRODUCTION_AUTH_URL;
  }
}

/** Resolved base URL for OAuth redirects and email links. */
export function getAuthBaseUrl(): string {
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_AUTH_URL;
  }

  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

pinProductionAuthUrl();
