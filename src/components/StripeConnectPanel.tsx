"use client";

import { useEffect, useState } from "react";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";

export function StripeConnectPanel() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await apiFetch("/api/stripe/connect");
    if (res.ok) {
      const d = await res.json();
      setConfigured(Boolean(d.configured));
      setOnboarded(Boolean(d.onboarded));
      setDashboardUrl(d.dashboardUrl ?? null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function startOnboarding() {
    setBusy(true);
    setMsg("");
    const res = await apiFetch("/api/stripe/connect", { method: "POST" });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(d.error ?? "Setup failed");
      return;
    }
    if (d.onboarded) {
      setOnboarded(true);
      setDashboardUrl(d.dashboardUrl ?? null);
      setMsg("Payout account connected");
      return;
    }
    if (d.url) window.location.href = d.url;
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#141416] p-4 mb-6 flex justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!configured) return null;

  return (
    <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-5 mb-6">
      <h2 className="font-semibold mb-1 flex items-center gap-2 text-sky-100">
        <CreditCard className="h-4 w-4" />
        Payout account (Stripe Connect)
      </h2>
      <p className="text-xs text-zinc-400 mb-3">
        Connect your bank via Stripe to receive automated cash-outs when admin approves withdrawals.
      </p>
      {onboarded ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-[#53fc18] font-medium">Connected</span>
          {dashboardUrl && (
            <a
              href={dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-sky-300 hover:underline"
            >
              Stripe dashboard <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={startOnboarding}
          disabled={busy}
          className="rounded-lg bg-sky-500/20 border border-sky-500/40 px-4 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-500/30 disabled:opacity-50"
        >
          {busy ? "Opening Stripe…" : "Set up payouts"}
        </button>
      )}
      {msg && <p className="text-xs text-zinc-400 mt-2">{msg}</p>}
    </div>
  );
}
