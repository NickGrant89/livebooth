"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Radio } from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";

interface DjResult {
  username: string;
  displayName: string;
  avatar: string;
  isLive: boolean;
}

export function NavbarSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DjResult[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      apiFetch(`/api/djs?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d) => setResults((d.djs ?? []).slice(0, 6)))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={wrapRef} className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search DJs..."
        className="w-full rounded-xl bg-white/[0.04] border border-white/[0.06] pl-10 pr-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-[#15CFF4]/40"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-white/10 bg-[#0c0c10] shadow-xl z-50 overflow-hidden">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-zinc-500">No DJs found</p>
          ) : (
            results.map((dj) => (
              <Link
                key={dj.username}
                href={dj.isLive ? `/stream/${dj.username}` : `/dj/${dj.username}`}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                }}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#53fc18] to-[#15CFF4] flex items-center justify-center text-xs font-bold text-black">
                  {dj.avatar || dj.displayName.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{dj.displayName}</p>
                  <p className="text-xs text-zinc-500">@{dj.username}</p>
                </div>
                {dj.isLive && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 uppercase">
                    <Radio className="h-3 w-3" /> Live
                  </span>
                )}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
