"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { ShareMenu } from "@/components/ShareMenu";
import { getClientSiteUrl } from "@/lib/share";
import { apiFetch } from "@/lib/fetch-client";
import { useAuth } from "@/context/AuthContext";

type Props = {
  streamId: string;
  djName: string;
  djUsername: string;
  title: string;
  setGrade: string | null;
  setScore: number | null;
};

function buildGradeCardUrl(params: Record<string, string>) {
  const q = new URLSearchParams(params);
  return `${getClientSiteUrl()}/api/og?${q.toString()}`;
}

export function FanGradeShare({
  streamId,
  djName,
  djUsername,
  title,
  setGrade,
  setScore,
}: Props) {
  const { user } = useAuth();
  const [contribution, setContribution] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    if (!user) return;
    apiFetch(`/api/set-score/contribution?streamId=${streamId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setContribution(d?.contribution?.points ?? null));
  }, [user, streamId]);

  if (!setGrade) return null;

  const cardParams: Record<string, string> = {
    type: "grade",
    dj: djName,
    title,
    username: djUsername,
    grade: setGrade,
  };
  if (setScore != null) cardParams.score = String(setScore);
  if (contribution != null) cardParams.contribution = String(contribution);
  const cardUrl = buildGradeCardUrl(cardParams);

  async function downloadGradeCard() {
    setDownloading(true);
    setDownloadError("");
    try {
      const res = await fetch(cardUrl);
      if (!res.ok) throw new Error("Could not generate grade card");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `livebooth-grade-${djUsername}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setDownloadError("Download failed — opening image in a new tab instead.");
      window.open(cardUrl, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-[#53fc18]/20 bg-[#53fc18]/5 p-4">
      <p className="text-xs uppercase tracking-widest text-[#53fc18] font-bold">Set grade</p>
      <p className="text-2xl font-black text-gradient mt-1">
        Grade {setGrade}
        {setScore != null && (
          <span className="text-base text-zinc-400 font-normal ml-2">
            {setScore.toLocaleString()} pts
          </span>
        )}
      </p>
      {contribution != null && contribution > 0 && (
        <p className="text-sm text-zinc-300 mt-1">
          You contributed +{contribution} to this set
        </p>
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          onClick={downloadGradeCard}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Grade card
        </button>
        <ShareMenu
          kind="recap"
          path={`/vod/${streamId}`}
          djName={djName}
          setTitle={title}
          username={djUsername}
          label="Share grade"
          variant="secondary"
          className="text-xs"
        />
      </div>
      {downloadError && (
        <p className="text-[10px] text-amber-400/90 mt-2">{downloadError}</p>
      )}
    </div>
  );
}
