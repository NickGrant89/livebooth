"use client";

import { useEffect, useState } from "react";
import { Megaphone, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";
import { DROP_TOKEN_SYMBOL, PROMOTION_TIERS } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";

export function PromoteBoothPanel({ streamId }: { streamId: string }) {
  const { refresh } = useAuth();
  const [active, setActive] = useState(false);
  const [promotedUntil, setPromotedUntil] = useState<string | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const res = await apiFetch(`/api/streams/promote/${streamId}`);
    if (res.ok) {
      const d = await res.json();
      setActive(Boolean(d.active));
      setPromotedUntil(d.promotedUntil ?? null);
      setTier(d.promotionTier ?? null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [streamId]);

  async function buy(t: "grid" | "hero") {
    setBuying(t);
    setError("");
    setSuccess("");
    const res = await apiFetch(`/api/streams/promote/${streamId}`, {
      method: "POST",
      body: JSON.stringify({ tier: t }),
    });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error ?? "Could not promote");
    } else {
      if (t === "hero") {
        setSuccess("Hero spotlight active — refresh Discover. The big banner shows Sponsored (stay live!).");
      } else {
        setSuccess("Grid boost active — refresh Discover. Your card in Live Channels gets a Sponsored badge (not the hero).");
      }
      await load();
      await refresh();
    }
    setBuying(null);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 mt-4">
      <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
        <Megaphone className="h-4 w-4" />
        Promote booth
      </h3>
      <p className="text-xs text-zinc-500 mt-1">
        Spend {DROP_TOKEN_SYMBOL} to get more eyes on Discover while you&apos;re live.
      </p>
      {active && promotedUntil && (
        <p className="text-xs text-amber-300/90 mt-2">
          Active: {tier === "hero" ? "Hero spotlight" : "Grid boost"} until{" "}
          {new Date(promotedUntil).toLocaleTimeString()}
        </p>
      )}
      <div className="grid sm:grid-cols-2 gap-2 mt-3">
        {(["grid", "hero"] as const).map((key) => {
          const t = PROMOTION_TIERS[key];
          return (
            <button
              key={key}
              type="button"
              disabled={buying !== null}
              onClick={() => buy(key)}
              className="rounded-lg border border-white/10 bg-black/30 p-3 text-left hover:border-amber-500/40 transition-colors"
            >
              <p className="text-xs font-bold text-white">{t.label}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{t.description}</p>
              <p className="text-sm font-bold text-amber-300 mt-2">
                {buying === key ? "…" : `${t.price} ${DROP_TOKEN_SYMBOL}`}
              </p>
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      {success && <p className="text-xs text-amber-200 mt-2">{success}</p>}
    </div>
  );
}
