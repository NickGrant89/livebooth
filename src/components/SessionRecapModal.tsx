"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { DROP_TOKEN_SYMBOL } from "@/lib/constants";
import { ShareRecapMenu } from "@/components/ShareRecapMenu";
import { SetRecordingDownloadButton } from "@/components/SetRecordingDownloadButton";

export interface RecapData {
  streamId: string;
  title: string;
  djName: string;
  djUsername: string;
  streak?: number;
  peakViewers: number;
  totalTips: number;
  durationMin: number;
  tipCount: number;
  unlockCount: number;
  setScore?: number | null;
  setGrade?: string | null;
  questContributions?: number;
  topTippers: Array<{ name: string; total: number }>;
}

export function SessionRecapModal({
  recap,
  onClose,
}: {
  recap: RecapData;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141416] p-6 relative">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
          <X className="h-5 w-5" />
        </button>
        <p className="text-[10px] uppercase tracking-widest text-[#53fc18] font-bold">Set complete</p>
        {recap.setGrade && (
          <p className="text-3xl font-black text-gradient mt-2">Grade {recap.setGrade}</p>
        )}
        <h2 className="text-xl font-bold mt-1">{recap.title}</h2>
        <p className="text-sm text-zinc-400">
          {recap.durationMin} min · {recap.peakViewers} peak · {recap.totalTips} {DROP_TOKEN_SYMBOL}
          {recap.setScore != null ? ` · ${recap.setScore.toLocaleString()} pts` : ""}
        </p>
        {recap.questContributions != null && recap.questContributions > 0 && (
          <p className="text-xs text-[#15CFF4] mt-2">
            {recap.questContributions} fan quest{recap.questContributions === 1 ? "" : "s"} cleared mid-set (+set score)
          </p>
        )}
        {recap.streak != null && recap.streak > 1 && (
          <p className="text-xs text-amber-400 mt-2">🔥 {recap.streak}-week streaming streak</p>
        )}
        {recap.topTippers.length > 0 && (
          <div className="mt-4 rounded-lg bg-white/5 p-3">
            <p className="text-xs text-zinc-500 mb-2">Top tippers</p>
            {recap.topTippers.slice(0, 3).map((t) => (
              <p key={t.name} className="text-sm flex justify-between">
                <span>{t.name}</span>
                <span className="text-[#53fc18]">{t.total} {DROP_TOKEN_SYMBOL}</span>
              </p>
            ))}
          </div>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link
            href={`/vod/${recap.streamId}`}
            className="text-center rounded-xl bg-white/10 py-2.5 text-sm font-medium hover:bg-white/15"
          >
            Replay
          </Link>
          <SetRecordingDownloadButton streamId={recap.streamId} className="w-full" />
          <ShareRecapMenu recap={recap} />
        </div>
      </div>
    </div>
  );
}
