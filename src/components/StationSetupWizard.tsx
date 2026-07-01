"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Loader2, Radio, ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";
import { normalizeStationSlug } from "@/lib/station-slug";
import { RADIO_TIERS } from "@/lib/constants";

interface StationSetupWizardProps {
  suggestedSlug: string;
  suggestedName: string;
  suggestedAvatar: string;
  onComplete: (slug: string) => void;
}

export function StationSetupWizard({
  suggestedSlug,
  suggestedName,
  suggestedAvatar,
  onComplete,
}: StationSetupWizardProps) {
  const [slug, setSlug] = useState(suggestedSlug);
  const [name, setName] = useState(suggestedName);
  const [tagline, setTagline] = useState("");
  const [avatar, setAvatar] = useState(suggestedAvatar.slice(0, 4));
  const [firstDj, setFirstDj] = useState("");
  const [showTitle, setShowTitle] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  async function createStation() {
    setLoading(true);
    setError("");
    const res = await apiFetch("/api/stations/owner", {
      method: "POST",
      body: JSON.stringify({
        slug: normalizeStationSlug(slug),
        name: name.trim(),
        tagline: tagline.trim() || undefined,
        avatar: avatar.trim() || undefined,
      }),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error ?? "Could not create station");
      return;
    }
    setCreatedSlug(body.station.slug);
    setStep(2);
  }

  async function addFirstResident() {
    if (!firstDj.trim()) {
      onComplete(createdSlug ?? slug);
      return;
    }
    setLoading(true);
    setError("");
    const res = await apiFetch("/api/stations/owner/residents", {
      method: "POST",
      body: JSON.stringify({
        djUsername: firstDj.trim(),
        showTitle: showTitle.trim() || undefined,
      }),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error ?? "Station created — add residents from the dashboard below");
      onComplete(createdSlug ?? slug);
      return;
    }
    onComplete(createdSlug ?? slug);
  }

  const community = RADIO_TIERS.community;

  return (
    <section
      id="station-dashboard"
      className="scroll-mt-24 rounded-2xl border border-[#53fc18]/30 bg-gradient-to-br from-[#53fc18]/5 to-transparent p-6 space-y-5"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#53fc18]/10 border border-[#53fc18]/30">
          <Building2 className="h-6 w-6 text-[#53fc18]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Set up your radio station</h2>
          <p className="text-sm text-zinc-400 mt-1">
            {step === 1
              ? "Create your channel page — takes about a minute."
              : "Optional: book your first resident DJ now."}
          </p>
          <p className="text-xs text-zinc-600 mt-2">
            {community.label} tier · up to {community.maxResidents} resident DJs · 70/20/10 tip split
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {step === 1 ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Station name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="KX Radio"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Public URL</label>
            <div className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm">
              <span className="text-zinc-600 shrink-0">/station/</span>
              <input
                value={slug}
                onChange={(e) => setSlug(normalizeStationSlug(e.target.value))}
                placeholder="kxradio"
                className="flex-1 bg-transparent text-white outline-none min-w-0"
              />
            </div>
            <p className="text-[11px] text-zinc-600 mt-1">Lowercase — this is the link you share</p>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Tagline (optional)</label>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Tip the drop — 24/7 underground"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Avatar badge</label>
            <input
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              maxLength={4}
              placeholder="KX"
              className="w-24 rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white"
            />
          </div>
          <button
            type="button"
            disabled={loading || !name.trim() || !slug.trim()}
            onClick={createStation}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#53fc18] py-3 text-sm font-bold text-black disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create station
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
          <p className="text-xs text-zinc-600 text-center">
            <Link href="/help/stations" className="text-zinc-500 hover:text-[#53fc18] underline">
              Read the station guide
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-[#53fc18]">
            Station live at{" "}
            <Link href={`/station/${createdSlug}`} className="underline font-medium">
              /station/{createdSlug}
            </Link>
          </p>
          <div>
            <label className="block text-xs text-zinc-500 mb-1 flex items-center gap-1">
              <Radio className="h-3.5 w-3.5" />
              First resident DJ username
            </label>
            <input
              value={firstDj}
              onChange={(e) => setFirstDj(e.target.value)}
              placeholder="neonpulse"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white"
            />
            <p className="text-[11px] text-zinc-600 mt-1">They must already have a DJ account on LiveBooth</p>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Show title (optional)</label>
            <input
              value={showTitle}
              onChange={(e) => setShowTitle(e.target.value)}
              placeholder="Friday Night Techno"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={addFirstResident}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#53fc18] py-3 text-sm font-bold text-black disabled:opacity-50 min-w-[140px]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {firstDj.trim() ? "Add DJ & finish" : "Skip for now"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
