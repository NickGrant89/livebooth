"use client";

import { useState, useEffect } from "react";
import { Wifi, Copy, Check, X } from "lucide-react";

const DEMO_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3008";
const DISMISS_KEY = "lb_dismiss_demo_banner";

export function DemoHostBanner() {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return;
    setVisible(localStorage.getItem(DISMISS_KEY) !== "1");
  }, []);

  if (!visible) return null;

  async function copyUrl() {
    await navigator.clipboard.writeText(DEMO_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  return (
    <div className="mx-3 sm:mx-4 lg:mx-6 mt-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 sm:px-4 py-3 overflow-hidden max-w-[calc(100vw-1.5rem)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-2 text-sm min-w-0">
          <Wifi className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-cyan-200">House demo — friends on same Wi‑Fi</p>
            <p className="text-xs text-zinc-400 mt-0.5 break-all font-mono">{DEMO_URL}</p>
            <p className="text-xs text-zinc-500 mt-1">
              Fan: <span className="text-zinc-300">demo@livebooth.local</span> · password123
              {" · "}4 live DJs on Discover
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={copyUrl}
            className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-3 py-1.5 text-xs font-bold text-cyan-200"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy link"}
          </button>
          <button type="button" onClick={dismiss} className="text-zinc-500 hover:text-white p-1" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
