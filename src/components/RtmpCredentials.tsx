"use client";

import { useState } from "react";
import { Copy, Check, Radio } from "lucide-react";

interface RtmpCredentialsProps {
  rtmpUrl: string;
  ingestKey: string;
  demoMode?: boolean;
}

export function RtmpCredentials({ rtmpUrl, ingestKey, demoMode }: RtmpCredentialsProps) {
  const [copied, setCopied] = useState<"url" | "key" | null>(null);

  async function copy(text: string, field: "url" | "key") {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="rounded-xl border border-[#15CFF4]/25 bg-[#15CFF4]/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Radio className="h-4 w-4 text-[#15CFF4]" />
        <h3 className="font-semibold text-sm">OBS / RTMP credentials</h3>
      </div>
      {demoMode && (
        <p className="text-xs text-amber-400/90">
          Demo mode — run <code className="font-mono">npm run rtmp:start</code> or set LIVEPEER_API_KEY for real ingest.
        </p>
      )}
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-zinc-500">Server URL</label>
        <div className="flex gap-2">
          <code className="flex-1 rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-zinc-300 truncate">
            {rtmpUrl}
          </code>
          <button
            type="button"
            onClick={() => copy(rtmpUrl, "url")}
            className="rounded-lg bg-white/10 px-3 py-2 hover:bg-white/15"
          >
            {copied === "url" ? <Check className="h-4 w-4 text-[#53fc18]" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-zinc-500">Stream key</label>
        <div className="flex gap-2">
          <code className="flex-1 rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-zinc-300 truncate font-mono">
            {ingestKey}
          </code>
          <button
            type="button"
            onClick={() => copy(ingestKey, "key")}
            className="rounded-lg bg-white/10 px-3 py-2 hover:bg-white/15"
          >
            {copied === "key" ? <Check className="h-4 w-4 text-[#53fc18]" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <p className="text-[11px] text-zinc-500">
        OBS → Settings → Stream → Custom → Service: Custom. Paste <strong className="text-zinc-400">Server URL</strong> and{" "}
        <strong className="text-zinc-400">Stream key</strong> separately (do not put the key in the server URL).
      </p>
    </div>
  );
}
