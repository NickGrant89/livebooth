"use client";

import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";
import { DROP_TOKEN_SYMBOL } from "@/lib/constants";

interface Tipper {
  displayName: string;
  username: string;
  avatar: string;
  total: number;
}

export function TopTippers({ streamId }: { streamId: string }) {
  const [tippers, setTippers] = useState<Tipper[]>([]);

  useEffect(() => {
    function load() {
      apiFetch(`/api/stream-stats/${streamId}`)
        .then((r) => r.json())
        .then((d) => setTippers(d.topTippers ?? []));
    }
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [streamId]);

  if (tippers.length === 0) return null;

  return (
    <div className="border-t border-white/[0.06] p-4">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3 flex items-center gap-1">
        <Coins className="h-3 w-3 text-[#53fc18]" />
        Top tippers this set
      </p>
      <div className="space-y-2">
        {tippers.slice(0, 5).map((t, i) => (
          <div key={t.username} className="flex items-center gap-2 text-sm">
            <span className="text-zinc-600 font-mono text-xs w-4">#{i + 1}</span>
            <span className="flex h-6 w-6 items-center justify-center rounded bg-white/5 text-[10px] font-bold">
              {t.avatar || t.displayName.slice(0, 2)}
            </span>
            <span className="flex-1 truncate text-zinc-300">{t.displayName}</span>
            <span className="text-[#53fc18] font-mono text-xs">{t.total} {DROP_TOKEN_SYMBOL}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
