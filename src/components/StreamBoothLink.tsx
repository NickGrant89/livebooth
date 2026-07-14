"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, ExternalLink } from "lucide-react";
import { getClientSiteUrl } from "@/lib/share";

export function StreamBoothLink({
  username,
  className = "",
}: {
  username: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const boothPath = `/stream/${username}`;
  const boothUrl = `${getClientSiteUrl()}${boothPath}`;

  async function copy() {
    await navigator.clipboard.writeText(boothUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`rounded-xl border border-white/10 bg-black/30 p-3 space-y-2.5 ${className}`}>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Your booth link</p>
      <div className="flex gap-2 min-w-0">
        <code className="flex-1 min-w-0 rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-zinc-300 truncate">
          {boothUrl}
        </code>
        <button
          type="button"
          onClick={() => copy()}
          className="shrink-0 rounded-lg bg-white/10 px-3 py-2 hover:bg-white/15"
          aria-label="Copy booth link"
        >
          {copied ? <Check className="h-4 w-4 text-[#53fc18]" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <Link
        href={boothPath}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#53fc18] hover:text-[#7dff4d]"
      >
        Open stream page
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
