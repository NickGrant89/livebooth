"use client";

import { useEffect, useState } from "react";
import { Music } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import Link from "next/link";

interface Track {
  id: string;
  title: string;
  artist: string;
  dj: string;
  streamTitle: string;
  unlockedAt: string;
}

export default function CratePage() {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/track-unlock")
      .then((r) => r.json())
      .then((d) => setTracks(d.tracks ?? []));
  }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Link href="/login" className="text-[#53fc18]">Login</Link> to view your crate
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Music className="h-7 w-7 text-[#53fc18]" />
        Your Crate
      </h1>
      <p className="text-zinc-400 text-sm mb-6">Track IDs you&apos;ve unlocked during live sets</p>
      <div className="space-y-2">
        {tracks.map((t) => (
          <div key={t.id} className="rounded-xl border border-white/5 bg-[#141416] px-4 py-3">
            <p className="font-medium">{t.title}</p>
            <p className="text-sm text-zinc-400">{t.artist}</p>
            <p className="text-xs text-zinc-600 mt-1">
              from {t.dj} · {t.streamTitle}
            </p>
          </div>
        ))}
        {tracks.length === 0 && (
          <p className="text-zinc-500 text-center py-8">No tracks unlocked yet. Watch a live set and unlock track IDs!</p>
        )}
      </div>
    </div>
  );
}
