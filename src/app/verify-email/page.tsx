"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { Logo } from "@/components/Logo";
import { apiFetch } from "@/lib/fetch-client";

function VerifyEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">(
    token ? "verifying" : "idle",
  );
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState(email);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    void (async () => {
      const res = await apiFetch("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (cancelled) return;
      if (res.ok) {
        setStatus("success");
        setMessage(data.message ?? "Email verified.");
        router.refresh();
        window.setTimeout(() => router.push("/"), 1500);
        return;
      }
      setStatus("error");
      setMessage(data.error ?? "Verification link invalid or expired.");
    })();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  async function resend(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResendLoading(true);
    setResendSent(false);
    const res = await apiFetch("/api/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email: resendEmail.trim() }),
    });
    await res.json();
    setResendLoading(false);
    setResendSent(true);
  }

  if (token && status === "verifying") {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#53fc18]" />
        <p className="mt-4 text-sm text-zinc-400">Verifying your email…</p>
      </div>
    );
  }

  if (token && status === "success") {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <p className="text-[#53fc18] font-semibold">{message}</p>
        <p className="mt-2 text-sm text-zinc-400">Redirecting you now…</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-8 space-y-5">
      {token && status === "error" && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {message}
        </div>
      )}

      {!token && (
        <div className="flex flex-col items-center text-center">
          <Mail className="h-10 w-10 text-[#53fc18]/80" />
          <p className="mt-4 text-sm text-zinc-300">
            We sent a verification link{email ? ` to ${email}` : ""}. Open it to activate your account,
            then sign in.
          </p>
          <p className="mt-2 text-xs text-zinc-500">Links expire after 24 hours.</p>
        </div>
      )}

      <form onSubmit={resend} className="space-y-3">
        <label htmlFor="resend-email" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Resend verification email
        </label>
        <input
          id="resend-email"
          type="email"
          value={resendEmail}
          onChange={(e) => setResendEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3.5 text-white"
        />
        <button
          type="submit"
          disabled={resendLoading}
          className="btn-primary w-full rounded-xl py-3.5 text-sm flex items-center justify-center gap-2"
        >
          {resendLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {resendLoading ? "Sending…" : "Resend link"}
        </button>
        {resendSent && (
          <p className="text-sm text-[#53fc18] text-center">
            If that account needs verification, a new link has been sent.
          </p>
        )}
      </form>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" showTagline link={false} />
          <h1 className="text-2xl font-bold mt-6">Verify your email</h1>
          <p className="text-zinc-500 mt-2 text-sm text-center">
            Confirm your address before signing in to LiveBooth.
          </p>
        </div>
        <Suspense fallback={<p className="text-zinc-500 text-center">Loading…</p>}>
          <VerifyEmailContent />
        </Suspense>
        <p className="text-center text-sm text-zinc-500 mt-4">
          Didn&apos;t get the email? Check spam, then resend above.{" "}
          <Link href="/help/fans#account" className="text-[#53fc18] hover:underline">
            Email help
          </Link>
          {" · "}
          <Link href="/support" className="text-[#53fc18] hover:underline">
            Support
          </Link>
        </p>
        <p className="text-center text-sm text-zinc-500 mt-2">
          Already verified?{" "}
          <Link href="/login" className="text-[#53fc18] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
