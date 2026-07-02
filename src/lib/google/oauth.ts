import { google } from "googleapis";
import prisma from "@/lib/prisma";
import { getAuthEnv } from "@/lib/auth-env";
import { ApiError } from "@/lib/api/response";

export type GoogleOAuth2Client = InstanceType<typeof google.auth.OAuth2>;

export async function getGoogleAccountForUser(userId: string) {
  return prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: {
      access_token: true,
      refresh_token: true,
      expires_at: true,
    },
  });
}

function createOAuth2Client() {
  const env = getAuthEnv();
  if (!env) {
    throw new ApiError(503, "Google OAuth is not configured");
  }

  return new google.auth.OAuth2(env.googleClientId, env.googleClientSecret);
}

export async function getAuthenticatedGoogleClient(
  userId: string,
): Promise<GoogleOAuth2Client> {
  const account = await getGoogleAccountForUser(userId);

  if (!account?.refresh_token && !account?.access_token) {
    throw new ApiError(
      503,
      "Google account is not connected for Gmail and Calendar. Sign out and sign in again to grant permissions.",
    );
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: account.access_token ?? undefined,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    if (!tokens.access_token && !tokens.refresh_token && !tokens.expiry_date) {
      return;
    }

    try {
      await prisma.account.updateMany({
        where: { userId, provider: "google" },
        data: {
          ...(tokens.access_token ? { access_token: tokens.access_token } : {}),
          ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
          ...(tokens.expiry_date
            ? { expires_at: Math.floor(tokens.expiry_date / 1000) }
            : {}),
        },
      });
    } catch (error) {
      console.error("[google] Failed to persist refreshed OAuth tokens", error);
    }
  });

  return oauth2Client;
}
