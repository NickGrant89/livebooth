"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { APP_TAGLINE, DROP_TOKEN_SYMBOL, CREATOR_TYPES, creatorTypeLabels } from "@/lib/constants";
import { signupAction } from "@/app/actions/auth";
import type { AuthFormState } from "@/app/actions/auth-types";

export default function SignupPage() {
  const [creatorRole, setCreatorRole] = useState<"fan" | "dj" | "station">("fan");
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    signupAction,
    null,
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" showTagline link={false} />
          <h1 className="text-2xl font-bold mt-6">Create your booth</h1>
          <p className="text-zinc-500 mt-2 text-sm">{APP_TAGLINE} · 500 {DROP_TOKEN_SYMBOL} welcome bonus</p>
        </div>

        <form action={formAction} className="glass rounded-2xl p-8 space-y-4">
          <div>
            <input
              name="displayName"
              required
              autoComplete="name"
              placeholder="Display name"
              className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-white"
            />
            <p className="mt-1.5 text-xs text-zinc-600">Shown on your profile and in chat</p>
          </div>
          <div>
            <input
              name="username"
              required
              autoComplete="username"
              placeholder="Username"
              onInput={(e) => {
                e.currentTarget.value = e.currentTarget.value.toLowerCase();
              }}
              className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-white"
            />
            <p className="mt-1.5 text-xs text-zinc-600">
              Lowercase letters, numbers, and underscore only — we auto-lowercase for you
            </p>
          </div>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-white"
          />
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="Password (min 6 chars)"
            className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-white"
          />
          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="fan"
                defaultChecked
                className="sr-only peer"
                onChange={() => setCreatorRole("fan")}
              />
              <span className="block rounded-xl border border-white/10 py-2.5 text-center text-sm peer-checked:border-[#53fc18] peer-checked:bg-[#53fc18]/10 peer-checked:text-[#53fc18]">
                Fan
              </span>
            </label>
            <label className="flex-1 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="dj"
                className="sr-only peer"
                onChange={() => setCreatorRole("dj")}
              />
              <span className="block rounded-xl border border-white/10 py-2.5 text-center text-xs sm:text-sm peer-checked:border-[#53fc18] peer-checked:bg-[#53fc18]/10 peer-checked:text-[#53fc18]">
                Creator
              </span>
            </label>
            <label className="flex-1 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="station"
                className="sr-only peer"
                onChange={() => setCreatorRole("station")}
              />
              <span className="block rounded-xl border border-white/10 py-2.5 text-center text-xs sm:text-sm peer-checked:border-[#53fc18] peer-checked:bg-[#53fc18]/10 peer-checked:text-[#53fc18]">
                Radio
              </span>
            </label>
          </div>
          {creatorRole === "dj" && (
            <div>
              <p className="text-xs text-zinc-500 mb-2">I am a…</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CREATOR_TYPES.map((t) => (
                  <label key={t} className="cursor-pointer">
                    <input
                      type="radio"
                      name="creatorType"
                      value={t}
                      defaultChecked={t === "dj"}
                      className="sr-only peer"
                    />
                    <span className="block rounded-lg border border-white/10 py-2 text-center text-xs peer-checked:border-[#53fc18] peer-checked:bg-[#53fc18]/10 peer-checked:text-[#53fc18]">
                      {creatorTypeLabels[t]}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-zinc-600 mt-2">
                DJs, solo musicians, bands & producers — same streaming tools, go live from OBS
              </p>
            </div>
          )}
          <p className="text-[11px] text-zinc-600 text-center -mt-2">
            Radio = branded channel for resident creators ·{" "}
            <Link href="/help/stations" className="text-zinc-500 hover:text-[#53fc18] underline">
              Learn more
            </Link>
          </p>

          {state?.error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {state.error}
            </div>
          )}

          <button type="submit" disabled={pending} className="btn-primary w-full rounded-xl py-3.5 text-sm flex items-center justify-center gap-2">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? "Creating account..." : "Sign Up — 500 DROP Free"}
          </button>

          <p className="text-center text-sm text-zinc-500">
            Have an account? <Link href="/login" className="text-[#53fc18] hover:underline">Sign in</Link>
            {" · "}
            <Link href="/help" className="text-zinc-400 hover:text-white hover:underline">How it works</Link>
          </p>
        </form>
      </div>
    </div>
  );

}
