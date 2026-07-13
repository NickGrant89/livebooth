"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { APP_TAGLINE } from "@/lib/constants";
import { loginAction } from "@/app/actions/auth";
import { apiFetch } from "@/lib/fetch-client";
import type { AuthFormState } from "@/app/actions/auth-types";

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const next = searchParams.get("next") ?? "";
  const isAdminLogin = next === "/admin";
  const [totpCode, setTotpCode] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState("");

  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    loginAction,
    null,
  );

  async function submitTotp(e: React.FormEvent) {
    e.preventDefault();
    if (!state?.pendingToken) return;
    setTotpLoading(true);
    setTotpError("");
    const res = await apiFetch("/api/auth/verify-totp", {
      method: "POST",
      body: JSON.stringify({ pendingToken: state.pendingToken, code: totpCode }),
    });
    const data = await res.json();
    setTotpLoading(false);
    if (!res.ok) {
      setTotpError(data.error ?? "Invalid code");
      return;
    }
    router.push(next.startsWith("/") ? next : "/admin");
    router.refresh();
  }

  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  async function resendVerification() {
    const emailInput = document.getElementById("email") as HTMLInputElement | null;
    const email = emailInput?.value?.trim();
    if (!email) return;
    setResendLoading(true);
    setResendSent(false);
    await apiFetch("/api/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    setResendLoading(false);
    setResendSent(true);
  }

  if (state?.requiresVerification) {
    return (
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" showTagline link={false} />
          <h1 className="text-2xl font-bold tracking-tight mt-6">Verify your email</h1>
          <p className="text-zinc-500 mt-2 text-sm text-center">
            {state.email
              ? `Check ${state.email} for the verification link before signing in.`
              : "Check your inbox for the verification link before signing in."}
          </p>
        </div>
        <div className="glass rounded-2xl p-8 space-y-4">
          {state.error && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-200">
              {state.error}
            </div>
          )}
          <button
            type="button"
            onClick={resendVerification}
            disabled={resendLoading}
            className="btn-primary w-full rounded-xl py-3.5 text-sm"
          >
            {resendLoading ? "Sending…" : "Resend verification email"}
          </button>
          {resendSent && (
            <p className="text-sm text-[#53fc18] text-center">If that account needs verification, a new link has been sent.</p>
          )}
          <p className="text-center text-sm text-zinc-500">
            <Link href="/verify-email" className="text-[#53fc18] hover:underline">
              Open verification help
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (state?.requiresTotp && state.pendingToken) {
    return (
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" showTagline link={false} />
          <h1 className="text-2xl font-bold tracking-tight mt-6">Two-factor auth</h1>
          <p className="text-zinc-500 mt-2 text-sm">Enter the 6-digit code for @{state.username}</p>
        </div>
        <form onSubmit={submitTotp} className="glass rounded-2xl p-8 space-y-5">
          <input
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3.5 text-white text-center tracking-widest"
          />
          {totpError && <p className="text-sm text-red-400">{totpError}</p>}
          <button type="submit" disabled={totpLoading} className="btn-primary w-full rounded-xl py-3.5 text-sm">
            {totpLoading ? "Verifying…" : "Verify & sign in"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col items-center mb-8">
        <Logo size="lg" showTagline link={false} />
        <h1 className="text-2xl font-bold tracking-tight mt-6">
          {isAdminLogin ? "Admin sign in" : "Welcome back"}
        </h1>
        <p className="text-zinc-500 mt-2 text-sm">{APP_TAGLINE} · unlock tracks · earn DROP</p>
      </div>

      <form action={formAction} className="glass rounded-2xl p-8 space-y-5">
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <label htmlFor="email" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Email or username
          </label>
          <input
            id="email"
            name="email"
            type="text"
            defaultValue={
              isDemo
                ? isAdminLogin
                  ? "admin@livebooth.local"
                  : "demo@livebooth.local"
                : undefined
            }
            autoComplete="username"
            required
            className="mt-1.5 w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3.5 text-white placeholder:text-zinc-600"
            placeholder={isDemo ? "demo or demo@livebooth.local" : "Email or username"}
          />
        </div>

        <div>
          <label htmlFor="password" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            defaultValue={isDemo ? "password123" : undefined}
            autoComplete="current-password"
            required
            className="mt-1.5 w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3.5 text-white"
          />
        </div>

        <p className="text-right">
          <Link href="/forgot-password" className="text-xs text-[#53fc18] hover:underline">
            Forgot password?
          </Link>
        </p>

        {state?.error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="btn-primary w-full rounded-xl py-3.5 text-sm flex items-center justify-center gap-2"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </button>

        <p className="text-center text-sm text-zinc-500">
          New here?{" "}
          <Link href="/signup" className="text-[#53fc18] font-medium hover:underline">
            Create account
          </Link>
          {" · "}
          <Link href="/help" className="text-zinc-400 hover:text-white hover:underline">
            How it works
          </Link>
        </p>
      </form>

        {isAdminLogin && !isDemo && (
          <p className="text-center text-xs text-zinc-500 mt-4">
            Admin access requires an account with the admin role.{" "}
            <Link href="/support" className="text-[#53fc18] hover:underline">
              Live support chat
            </Link>{" "}
            if you need access.
          </p>
        )}

        {isDemo && (
        <div className="text-center text-xs text-zinc-600 mt-6 font-mono space-y-1">
          <p>Local demo — see DemoHostBanner for LAN URL</p>
          <p>Fan: demo@livebooth.local · DJ: neonpulse@livebooth.local</p>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-zinc-500">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
