"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { apiFetch } from "@/lib/fetch-client";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    const res = await apiFetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Reset failed");
      return;
    }
    router.push("/login");
  }

  if (!token) {
    return (
      <p className="text-red-400 text-sm">
        Invalid reset link. <Link href="/forgot-password" className="underline">Request a new one</Link>.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="glass rounded-2xl p-8 space-y-5">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
        placeholder="New password (min 6 chars)"
        className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3.5 text-white"
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
        minLength={6}
        placeholder="Confirm password"
        className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3.5 text-white"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-[#53fc18] py-3.5 font-bold text-black disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Set new password
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" showTagline link={false} />
          <h1 className="text-2xl font-bold mt-6">Choose new password</h1>
        </div>
        <Suspense fallback={<p className="text-zinc-500 text-center">Loading…</p>}>
          <ResetForm />
        </Suspense>
        <p className="text-center text-sm text-zinc-500 mt-4">
          <Link href="/login" className="text-[#53fc18] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
