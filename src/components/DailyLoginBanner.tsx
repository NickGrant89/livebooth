"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { DAILY_LOGIN_DROP, DROP_TOKEN_SYMBOL } from "@/lib/constants";

export function DailyLoginBanner() {
  const { user, refresh: refreshAuth } = useAuth();
  const [claimed, setClaimed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/daily-login")
      .then((r) => r.json())
      .then((d) => setClaimed(Boolean(d.claimedToday)));
  }, [user]);

  if (!user || claimed) return null;

  async function claim() {
    setLoading(true);
    const res = await apiFetch("/api/daily-login", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setClaimed(true);
      setMsg(data.message);
      await refreshAuth();
    } else {
      setMsg(data.error ?? "Could not claim");
    }
  }

  return (
    <div className="mx-4 lg:mx-6 mt-3 rounded-xl border border-[#53fc18]/25 bg-[#53fc18]/5 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        <Sparkles className="h-4 w-4 text-[#53fc18]" />
        <span>
          Daily booth bonus: <strong className="text-[#53fc18]">{DAILY_LOGIN_DROP} {DROP_TOKEN_SYMBOL}</strong> for showing up
        </span>
      </div>
      <button
        type="button"
        onClick={claim}
        disabled={loading}
        className="rounded-lg bg-[#53fc18] px-4 py-1.5 text-xs font-bold text-black disabled:opacity-50"
      >
        {loading ? "..." : "Claim"}
      </button>
      {msg && <p className="text-xs text-zinc-400 w-full">{msg}</p>}
    </div>
  );
}
