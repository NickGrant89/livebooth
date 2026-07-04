"use client";

import { useState } from "react";
import Link from "next/link";
import { Tv, Copy, Check, ExternalLink } from "lucide-react";

export function StationEmbedSection({
  slug,
  stationName,
  appUrl,
}: {
  slug: string;
  stationName: string;
  appUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const embedUrl = `${appUrl}/embed/station/${slug}`;
  const snippet = `<iframe src="${embedUrl}" width="100%" height="420" frameborder="0" allow="autoplay; fullscreen" title="${stationName} live"></iframe>`;

  async function copySnippet() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-xl border border-white/10 bg-[#141416] p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-[#53fc18]/10 p-2 text-[#53fc18]">
          <Tv className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-white">Embed live video on your site</h2>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            Paste this iframe on your station website. When you go live on the video channel, the
            embed shows your HLS stream automatically. Fans can open{" "}
            <Link href={`/station/${slug}/live`} className="text-[#53fc18] hover:underline">
              /station/{slug}/live
            </Link>{" "}
            for chat and tips.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/40 overflow-hidden">
        <iframe
          src={embedUrl}
          width="100%"
          height="280"
          title={`${stationName} embed preview`}
          className="w-full bg-black"
          allow="autoplay; fullscreen"
        />
      </div>

      <pre className="rounded-lg border border-white/10 bg-black/50 p-3 text-[11px] text-zinc-400 overflow-x-auto whitespace-pre-wrap break-all">
        {snippet}
      </pre>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copySnippet()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#53fc18]/10 border border-[#53fc18]/30 px-3 py-2 text-xs font-semibold text-[#53fc18] hover:bg-[#53fc18]/20"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy embed code"}
        </button>
        <Link
          href={embedUrl}
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open embed preview
        </Link>
      </div>
    </section>
  );
}
