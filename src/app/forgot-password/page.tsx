"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { apiFetch } from "@/lib/fetch-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [devUrl, setDevUrl] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setDevUrl("");
    const res = await apiFetch("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(data.message ?? "Check your email for a reset link.");
    if (data.devResetUrl) setDevUrl(data.devResetUrl);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" showTagline link={false} />
          <h1 className="text-2xl font-bold mt-6">Reset password</h1>
          <p className="text-zinc-500 mt-2 text-sm text-center">
            Enter your email and we&apos;ll send a link to choose a new password.
          </p>
        </div>
        <form onSubmit={submit} className="glass rounded-2xl p-8 space-y-5">
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Email or username"
            className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3.5 text-white"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#53fc18] py-3.5 font-bold text-black disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send reset link
          </button>
          {message && <p className="text-sm text-[#53fc18]">{message}</p>}
          {devUrl && (
            <p className="text-xs text-zinc-500 break-all">
              Dev link:{" "}
              <Link href={devUrl.replace(/^https?:\/\/[^/]+/, "")} className="text-[#53fc18] underline">
                {devUrl}
              </Link>
            </p>
          )}
          <p className="text-center text-sm text-zinc-500">
            <Link href="/login" className="text-[#53fc18] hover:underline">Back to sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
