"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { VIP_SUB_COST } from "@/lib/constants";

export function SubscribeButton({ djUsername }: { djUsername: string }) {
  const { user, refresh } = useAuth();
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const [showPerks, setShowPerks] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecked(true);
      return;
    }
    apiFetch(`/api/subscribe?djUsername=${encodeURIComponent(djUsername)}`)
      .then((r) => r.json())
      .then((d) => setSubscribed(Boolean(d.subscribed)))
      .finally(() => setChecked(true));
  }, [user, djUsername]);

  async function subscribe() {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    setError("");
    const res = await apiFetch("/api/subscribe", {
      method: "POST",
      body: JSON.stringify({ djUsername }),
    });
    const data = await res.json();
    if (res.ok) {
      setSubscribed(true);
      await refresh();
    } else {
      setError(data.error ?? "Subscription failed");
    }
    setLoading(false);
  }

  async function unsubscribe() {
    setLoading(true);
    setError("");
    const res = await apiFetch(`/api/subscribe?djUsername=${encodeURIComponent(djUsername)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSubscribed(false);
    } else {
      const data = await res.json();
      setError(data.error ?? "Could not cancel");
    }
    setLoading(false);
  }

  return (
    <div className="relative">
      <div className="flex gap-1">
        <button
          onClick={subscribed ? unsubscribe : subscribe}
          disabled={loading || !checked}
          onMouseEnter={() => setShowPerks(true)}
          onMouseLeave={() => setShowPerks(false)}
          className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl bg-purple-500/20 border border-purple-500/30 px-3 sm:px-4 py-2 text-sm font-semibold text-purple-300 hover:bg-purple-500/30 transition-colors disabled:opacity-60 min-w-0"
        >
          <Star className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {!checked ? "..." : subscribed ? "VIP ✓" : loading ? "..." : (
              <>
                <span className="sm:hidden">VIP</span>
                <span className="hidden sm:inline">VIP · {VIP_SUB_COST} DROP/mo</span>
              </>
            )}
          </span>
        </button>
      </div>
      {showPerks && !subscribed && (
        <div className="absolute top-full right-0 mt-2 z-20 w-56 rounded-lg border border-purple-500/20 bg-[#141416] p-3 text-xs text-zinc-400 shadow-xl">
          <p className="font-semibold text-purple-300 mb-1">VIP booth perks</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>30% off track IDs & requests</li>
            <li>VIP badge in chat</li>
            <li>Support your favorite DJ</li>
          </ul>
        </div>
      )}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
