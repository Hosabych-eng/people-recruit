"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

function LoginContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from") || "/recruiting";
  const error = searchParams.get("error");

  const handleGoogleSignIn = () => {
    void signIn("google", { callbackUrl: redirectTo });
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sidebar-accent text-sm font-bold text-white">
          PR
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          PeopleRecruit
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Увійти</h1>
        <p className="mt-2 text-sm text-muted">
          Доступ лише за запрошенням адміністратора.
        </p>
      </div>

      {error === "AccessDenied" && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Доступ заборонено. Перевірте, чи ваш Google-акаунт запрошено до системи.
        </div>
      )}

      {process.env.NODE_ENV === "development" &&
        (error === "OAuthCallback" ||
          error === "Configuration" ||
          error === "OAuthSignin") && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Помилка OAuth. Перевірте у файлі <code>.env</code>:{" "}
          <strong>GOOGLE_CLIENT_ID</strong>, <strong>GOOGLE_CLIENT_SECRET</strong>,{" "}
          <strong>NEXTAUTH_URL</strong> (має збігатися з портом dev-сервера, напр.{" "}
          <code>http://localhost:3000</code> або <code>:3010</code>).
        </div>
      )}

      <Button type="button" className="w-full gap-2" onClick={handleGoogleSignIn}>
        <GoogleIcon />
        Увійти через Google
      </Button>

      <p className="mt-6 text-center text-xs text-muted">
        Потрібне активне запрошення або обліковий запис ізі статусом ACTIVE.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6" />
          </div>
        }
      >
        <LoginContent />
      </Suspense>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
