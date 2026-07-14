"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Radio, Tv } from "lucide-react";
import { GoLivePreview } from "@/components/GoLivePreview";
import { StreamDetailsFields } from "@/components/StreamDetailsFields";
import { apiFetch } from "@/lib/fetch-client";
import { genreLabels } from "@/lib/constants";

type ChannelStream = {
  id: string;
  title: string;
  ingestKey: string;
  rtmpUrl: string;
  playbackUrl: string;
  status: "preparing" | "live";
  ingestMode?: "livepeer" | "local" | "demo";
};

type Props = {
  stationName: string;
  stationSlug: string;
  onStatusChange?: () => void;
};

export function StationGoLivePanel({ stationName, stationSlug, onStatusChange }: Props) {
  const [stream, setStream] = useState<ChannelStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState(`${stationName} live`);
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("mixed");
  const [rtmpOnline, setRtmpOnline] = useState<boolean | null>(null);

  const load = useCallback(() => {
    apiFetch("/api/stations/owner/go-live")
      .then((r) => r.json())
      .then((d: { stream: ChannelStream | null }) => {
        setStream(d.stream);
        if (d.stream?.title) setTitle(d.stream.title);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    apiFetch("/api/rtmp/health")
      .then((r) => r.json())
      .then((d: { reachable?: boolean | null }) => {
        setRtmpOnline(typeof d.reachable === "boolean" ? d.reachable : null);
      })
      .catch(() => setRtmpOnline(null));
  }, [load]);

  async function startChannel() {
    setSubmitting(true);
    setError("");
    const res = await apiFetch("/api/stations/owner/go-live", {
      method: "POST",
      body: JSON.stringify({ title, genre, description: description || undefined }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to start channel");
      return;
    }
    setStream(data.stream);
    onStatusChange?.();
  }

  async function publishChannel() {
    if (!stream?.id) return;
    setSubmitting(true);
    setError("");
    const res = await apiFetch("/api/stations/owner/go-live/publish", {
      method: "POST",
      body: JSON.stringify({ streamId: stream.id }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to go live");
      return;
    }
    setStream(data.stream);
    onStatusChange?.();
  }

  async function endChannel() {
    const isPreview = stream?.status === "preparing";
    if (
      isPreview &&
      !window.confirm("Discard this preview? Nothing will be published.")
    ) {
      return;
    }
    if (
      stream?.status === "live" &&
      !window.confirm("End the station video channel? Listeners will no longer see your feed.")
    ) {
      return;
    }
    setSubmitting(true);
    setError("");
    const res = await apiFetch("/api/stations/owner/go-live", { method: "DELETE" });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Could not end channel");
      return;
    }
    setStream(null);
    onStatusChange?.();
    if (stream?.status === "live" && data.replayHint) {
      window.alert(data.replayHint);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 p-6 text-center text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
        Loading station channel…
      </div>
    );
  }

  if (stream?.status === "live") {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-red-300 flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 animate-pulse" /> Station channel live
            </p>
            <p className="text-lg font-bold text-white mt-1">{stream.title}</p>
            <p className="text-xs text-zinc-500 mt-1">
              Fans watch at{" "}
              <Link href={`/station/${stationSlug}/live`} className="text-[#53fc18] hover:underline">
                /station/{stationSlug}/live
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/station/${stationSlug}/live`}
              className="rounded-lg bg-[#53fc18] px-4 py-2 text-sm font-bold text-black"
            >
              Open booth
            </Link>
            <button
              type="button"
              onClick={endChannel}
              disabled={submitting}
              className="rounded-lg bg-red-500/20 border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/30 disabled:opacity-50"
            >
              {submitting ? "Ending…" : "End channel"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stream?.status === "preparing") {
    return (
      <div className="rounded-xl border border-[#15CFF4]/30 bg-[#15CFF4]/5 p-5 space-y-4">
        {error && <p className="text-sm text-red-400">{error}</p>}
        <GoLivePreview
          title={stream.title}
          djName={stationName}
          playbackUrl={stream.playbackUrl}
          rtmpUrl={stream.rtmpUrl}
          ingestKey={stream.ingestKey}
          ingestMode={stream.ingestMode}
          rtmpOnline={rtmpOnline}
          onPublish={publishChannel}
          publishing={submitting}
        />
        <button
          type="button"
          onClick={endChannel}
          disabled={submitting}
          className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm text-zinc-400 hover:bg-white/10 disabled:opacity-50"
        >
          {submitting ? "Discarding…" : "Cancel setup — don't publish"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#53fc18]/10 shrink-0">
          <Tv className="h-5 w-5 text-[#53fc18]" />
        </div>
        <div>
          <h3 className="font-bold text-white">Station video channel</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Stream from your studio encoder to the station page — separate from resident DJ Go Live
            sessions. Tips split 70% you / 20% station / 10% platform.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <StreamDetailsFields
        title={title}
        description={description}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        titlePlaceholder="Show title"
        descriptionPlaceholder="Describe this station show for fans and replay viewers."
        compact
      />

      <div>
        <label className="block text-xs text-zinc-500 mb-1.5">Genre</label>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
        >
          {Object.entries(genreLabels).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={startChannel}
        disabled={submitting || !title.trim()}
        className="w-full rounded-lg bg-[#53fc18] py-2.5 text-sm font-bold text-black disabled:opacity-50"
      >
        {submitting ? "Starting…" : "Get RTMP key & preview"}
      </button>
    </div>
  );
}
