import "@/lib/auth-url";
import type { NextAuthOptions } from "next-auth";
import type { UserRole, UserStatus } from "@prisma/client";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { assertAuthEnv, getAuthEnv } from "@/lib/auth-env";
import { getAuthBaseUrl } from "@/lib/auth-url";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function loadUserAuthFields(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true, email: true, name: true },
  });
}

async function redeemInvitation(userId: string, email: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { email: normalizeEmail(email) },
  });

  if (!invitation || invitation.expiresAt <= new Date()) {
    return false;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        status: "ACTIVE",
        role: invitation.role,
        emailVerified: new Date(),
      },
    }),
    prisma.invitation.delete({ where: { id: invitation.id } }),
  ]);

  return true;
}

function buildAuthOptions(): NextAuthOptions {
  const env = getAuthEnv();

  if (!env) {
    return {
      providers: [],
      secret: process.env.AUTH_SECRET ?? "missing-auth-config",
      pages: { signIn: "/login", error: "/login" },
    };
  }

  // NextAuth v4: base URL is controlled via NEXTAUTH_URL (pinned in auth-url.ts on
  // production). trustHost is Auth.js v5 only — not available in next-auth@4.
  return {
    adapter: PrismaAdapter(prisma),
    providers: [
      GoogleProvider({
        clientId:
          process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID || "",
        clientSecret:
          process.env.GOOGLE_CLIENT_SECRET ||
          process.env.AUTH_GOOGLE_SECRET ||
          "",
        allowDangerousEmailAccountLinking: true,
        authorization: {
          params: {
            scope:
              "openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.send",
            access_type: "offline",
            prompt: "consent",
          },
        },
      }),
    ],
    pages: {
      signIn: "/login",
      error: "/login",
    },
    session: {
      strategy: "jwt",
      maxAge: 60 * 60 * 24,
    },
    debug: process.env.NODE_ENV === "development",
    callbacks: {
      async signIn({ user, account }) {
        try {
          if (account?.provider !== "google") return false;

          const email = user.email ? normalizeEmail(user.email) : null;
          if (!email) return false;

          const existing = await prisma.user.findUnique({
            where: { email },
            select: { id: true, status: true },
          });

          if (existing?.status === "ACTIVE") return true;

          const invitation = await prisma.invitation.findUnique({
            where: { email },
            select: { expiresAt: true },
          });

          return Boolean(invitation && invitation.expiresAt > new Date());
        } catch (error) {
          console.error("[auth] signIn callback failed", error);
          return false;
        }
      },
      async jwt({ token, user, trigger, account }) {
        if (account?.provider === "google") {
          if (account.access_token) {
            token.accessToken = account.access_token;
          }
          if (account.refresh_token) {
            token.refreshToken = account.refresh_token;
          }
          if (account.expires_at) {
            token.accessTokenExpires = account.expires_at;
          }

          console.log("[auth] Google OAuth token handling", {
            userId: user?.id ?? token.sub,
            hasAccessToken: Boolean(account.access_token),
            hasRefreshToken: Boolean(account.refresh_token),
            scope: account.scope ?? null,
            expiresAt: account.expires_at ?? null,
          });

          const oauthUserId =
            user?.id ?? (typeof token.sub === "string" ? token.sub : undefined);

          if (oauthUserId) {
            try {
              await prisma.account.updateMany({
                where: { userId: oauthUserId, provider: "google" },
                data: {
                  access_token: account.access_token ?? undefined,
                  ...(account.refresh_token
                    ? { refresh_token: account.refresh_token }
                    : {}),
                  expires_at: account.expires_at ?? undefined,
                  scope: account.scope ?? undefined,
                  token_type: account.token_type ?? undefined,
                },
              });

              console.log(
                "[auth] Google OAuth tokens persisted to Prisma Account",
                { userId: oauthUserId },
              );
            } catch (error) {
              console.error(
                "[auth] Failed to persist Google OAuth tokens to Prisma",
                error,
              );
            }
          }
        }

        const userId =
          user?.id ?? (typeof token.sub === "string" ? token.sub : undefined);
        if (!userId) return token;

        if (user?.email && account?.provider === "google") {
          try {
            const dbUser = await loadUserAuthFields(userId);
            if (dbUser?.status === "PENDING" && dbUser.email) {
              await redeemInvitation(userId, dbUser.email);
            }
          } catch (error) {
            console.error("[auth] invitation redemption failed", error);
          }
        }

        let dbUser = await loadUserAuthFields(userId);

        if (
          dbUser?.status === "PENDING" &&
          dbUser.email &&
          (user || trigger === "update")
        ) {
          try {
            const redeemed = await redeemInvitation(userId, dbUser.email);
            if (redeemed) {
              dbUser = await loadUserAuthFields(userId);
            }
          } catch (error) {
            console.error("[auth] jwt invitation redemption failed", error);
          }
        }

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.status = dbUser.status;
          token.email = dbUser.email ?? token.email;
          token.name = dbUser.name ?? token.name;
        }

        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = (token.id as string) ?? token.sub ?? "";
          session.user.role = token.role as UserRole;
          session.user.status = token.status as UserStatus;
          session.user.email = (token.email as string) ?? session.user.email ?? "";
          session.user.name = (token.name as string) ?? session.user.name ?? "";
        }

        if (process.env.NODE_ENV === "development" && token.accessToken) {
          console.log("[auth] Session built from JWT with Google tokens", {
            userId: session.user?.id,
            hasAccessToken: Boolean(token.accessToken),
            hasRefreshToken: Boolean(token.refreshToken),
          });
        }

        return session;
      },
      async redirect({ url }) {
        const canonicalBase = getAuthBaseUrl();

        if (url.startsWith("/")) {
          return `${canonicalBase}${url}`;
        }

        try {
          const target = new URL(url);

          if (process.env.NODE_ENV === "production") {
            // Never follow Vercel preview / deployment-hash hosts in production.
            const path = `${target.pathname}${target.search}${target.hash}`;
            return path && path !== "/"
              ? `${canonicalBase}${path}`
              : `${canonicalBase}/recruiting`;
          }

          if (target.origin === canonicalBase) {
            return url;
          }
        } catch {
          // Invalid URL — fall through to safe default.
        }

        return `${canonicalBase}/recruiting`;
      },
    },
    events: {
      async signIn({ user, account }) {
        if (account?.provider !== "google" || !user.id || !user.email) return;

        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { status: true, email: true },
          });

          if (dbUser?.status === "ACTIVE") return;

          await redeemInvitation(user.id, user.email);
        } catch (error) {
          console.error("[auth] signIn event failed", error);
        }
      },
    },
    secret: env.nextAuthSecret,
  };
}

export const authOptions: NextAuthOptions = buildAuthOptions();

export function validateAuthConfiguration() {
  return assertAuthEnv();
}
