import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthEnvIssues } from "@/lib/auth-env";

if (process.env.NODE_ENV === "development") {
  const issues = getAuthEnvIssues();
  if (issues.length > 0) {
    console.warn("[auth] configuration issues:", issues.join("; "));
  }
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
