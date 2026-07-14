"use client";

import Link from "next/link";
import { Shield, LogIn } from "lucide-react";

export function AdminAccessDenied({ role }: { role: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <Shield className="h-14 w-14 text-red-400/60 mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-white mb-2">Staff access required</h1>
      <p className="text-zinc-400 text-sm mb-6">
        You&apos;re signed in as <strong className="text-zinc-300">{role}</strong>. This area is for platform
        admins and moderators only.
      </p>
      <div className="space-y-3">
        <Link
          href="/login?next=/admin"
          className="inline-flex items-center gap-2 rounded-xl bg-red-500/15 border border-red-500/30 px-6 py-3 text-sm font-bold text-red-300 hover:bg-red-500/25"
        >
          <LogIn className="h-4 w-4" />
          Sign in as admin
        </Link>
        <Link href="/" className="block text-sm text-zinc-500 hover:text-white">
          ← Back to Discover
        </Link>
      </div>
    </div>
  );
}
