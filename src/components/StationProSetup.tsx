"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  Radio,
  SkipForward,
  Tv,
  Users,
} from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";

type Props = {
  stationSlug: string;
  relayUrl: string;
  embedColor: string;
  embedSnippet: string | null;
  embedPreviewUrl: string | null;
  residentCount: number;
  onRelayUrlChange: (url: string) => void;
  onEmbedColorChange: (color: string) => void;
  onSaved: () => void;
};

type StepId = "relay" | "embed" | "residents";

export function StationProSetup({
  stationSlug,
  relayUrl,
  embedColor,
  embedSnippet,
  embedPreviewUrl,
  residentCount,
  onRelayUrlChange,
  onEmbedColorChange,
  onSaved,
}: Props) {
  const [step, setStep] = useState<StepId>("relay");
  const [draftRelay, setDraftRelay] = useState(relayUrl);
  const [saving, setSaving] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [skippedRelay, setSkippedRelay] = useState(false);
  const [embedAcknowledged, setEmbedAcknowledged] = useState(false);

  const relayDone = Boolean(relayUrl.trim()) || skippedRelay;
  const embedDone = embedAcknowledged;
  const residentsDone = residentCount > 0;

  const progress = useMemo(() => {
    let n = 0;
    if (relayDone) n++;
    if (embedDone) n++;
    if (residentsDone) n++;
    return n;
  }, [relayDone, embedDone, residentsDone]);

  if (progress >= 3) return null;

  async function saveRelay() {
    setSaving(true);
    setError("");
    const res = await apiFetch("/api/stations/owner", {
      method: "PATCH",
      body: JSON.stringify({
        relayUrl: draftRelay.trim() || null,
        embedPrimaryColor: embedColor,
      }),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(body.error ?? "Save failed");
      return;
    }
    onRelayUrlChange(draftRelay);
    onSaved();
    setStep("embed");
  }

  async function verifyRelay() {
    setVerifyMsg("");
    setSaving(true);
    if (draftRelay.trim() && draftRelay !== relayUrl) {
      const saveRes = await apiFetch("/api/stations/owner", {
        method: "PATCH",
        body: JSON.stringify({ relayUrl: draftRelay.trim() }),
      });
      if (!saveRes.ok) {
        const body = await saveRes.json();
        setSaving(false);
        setError(body.error ?? "Save relay URL first");
        return;
      }
      onRelayUrlChange(draftRelay);
    }
    const res = await apiFetch("/api/stations/owner/relay/verify", { method: "POST" });
    const body = await res.json();
    setSaving(false);
    setVerifyMsg(body.ok ? body.message : (body.message ?? body.error ?? "Verify failed"));
  }

  async function saveEmbedColor() {
    setSaving(true);
    setError("");
    const res = await apiFetch("/api/stations/owner", {
      method: "PATCH",
      body: JSON.stringify({ embedPrimaryColor: embedColor }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Save failed");
      return;
    }
    onSaved();
  }

  function copyEmbed() {
    if (!embedSnippet) return;
    navigator.clipboard.writeText(embedSnippet);
    setCopied(true);
    setEmbedAcknowledged(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function skipRelay() {
    setSkippedRelay(true);
    setStep("embed");
  }

  const steps: { id: StepId; label: string; done: boolean; icon: typeof Radio }[] = [
    { id: "relay", label: "Relay stream", done: relayDone, icon: Radio },
    { id: "embed", label: "Website embed", done: embedDone, icon: Tv },
    { id: "residents", label: "Resident DJs", done: residentsDone, icon: Users },
  ];

  return (
    <section className="rounded-xl border border-[#15CFF4]/25 bg-gradient-to-br from-[#15CFF4]/8 to-transparent p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-white flex items-center gap-2">
            Pro setup
            <span className="text-[10px] font-normal text-zinc-500">
              {progress}/3 complete
            </span>
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Configure relay, embed, and your lineup — takes about 5 minutes.
          </p>
        </div>
        <div className="flex gap-1">
          {steps.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold border transition-colors ${
                step === s.id
                  ? "border-[#15CFF4]/50 bg-[#15CFF4]/10 text-[#15CFF4]"
                  : s.done
                    ? "border-[#53fc18]/30 text-[#53fc18]"
                    : "border-white/10 text-zinc-500"
              }`}
            >
              {s.done ? <Check className="h-3 w-3" /> : <s.icon className="h-3 w-3" />}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
      )}

      {step === "relay" && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-zinc-300">
            <strong className="text-white">Relay (optional)</strong> — paste your Icecast, Radio.co, or
            other HLS stream URL. Fans hear this when no resident DJ is live on video.
          </p>
          <input
            value={draftRelay}
            onChange={(e) => setDraftRelay(e.target.value)}
            placeholder="https://your-radio.example.com/live/stream.m3u8"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm font-mono text-xs"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveRelay}
              disabled={saving || !draftRelay.trim()}
              className="rounded-lg bg-[#53fc18] px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save & continue"}
            </button>
            <button
              type="button"
              onClick={verifyRelay}
              disabled={saving || !draftRelay.trim()}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
            >
              Verify URL
            </button>
            <button
              type="button"
              onClick={skipRelay}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300"
            >
              <SkipForward className="h-3.5 w-3.5" />
              Skip — video-only for now
            </button>
          </div>
          {verifyMsg && <p className="text-xs text-zinc-500">{verifyMsg}</p>}
          <p className="text-[11px] text-zinc-600">
            Live video sets still come from resident DJs via{" "}
            <Link href="/go-live" className="text-[#53fc18] hover:underline">
              Go Live
            </Link>{" "}
            + OBS.
          </p>
        </div>
      )}

      {step === "embed" && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-zinc-300">
            <strong className="text-white">Website embed</strong> — add the player to your station
            website. Shows live video when a resident is on air, or relay when off air.
          </p>
          <div className="max-w-xs">
            <label className="text-[10px] text-zinc-500 uppercase">Accent color</label>
            <input
              type="color"
              value={embedColor}
              onChange={(e) => onEmbedColorChange(e.target.value)}
              onBlur={saveEmbedColor}
              className="mt-1 h-10 w-full rounded-lg cursor-pointer bg-transparent"
            />
          </div>
          {embedSnippet && (
            <>
              <pre className="text-[10px] font-mono bg-black/40 border border-white/10 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
                {embedSnippet}
              </pre>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyEmbed}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#53fc18] px-4 py-2 text-sm font-bold text-black"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy embed code"}
                </button>
                {embedPreviewUrl && (
                  <Link
                    href={embedPreviewUrl}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
                  >
                    Preview embed
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setEmbedAcknowledged(true);
              setStep("residents");
            }}
            className="inline-flex items-center gap-1 text-sm text-[#15CFF4] hover:underline"
          >
            Continue to residents
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {step === "residents" && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-zinc-300">
            <strong className="text-white">Resident DJs</strong> — add usernames below. Each resident
            goes live with OBS for live video shows branded as{" "}
            <Link href={`/station/${stationSlug}`} className="text-[#53fc18] hover:underline">
              {stationSlug}
            </Link>
            .
          </p>
          {residentsDone ? (
            <p className="text-sm text-[#53fc18] flex items-center gap-2">
              <Check className="h-4 w-4" />
              {residentCount} resident{residentCount === 1 ? "" : "s"} added — you&apos;re set!
            </p>
          ) : (
            <p className="text-xs text-zinc-500">
              Scroll to the <strong className="text-zinc-400">Residents</strong> section below and add
              your first DJ username.
            </p>
          )}
          <Link
            href="/help/stations#residents"
            className="inline-flex items-center gap-1 text-xs text-[#53fc18] hover:underline"
          >
            Station guide — residents &amp; lineup
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}
    </section>
  );
}
