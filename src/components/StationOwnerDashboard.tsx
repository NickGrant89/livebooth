"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Radio,
  Users,
  Coins,
  Upload,
  Trash2,
  ExternalLink,
  Loader2,
  Target,
  BookOpen,
} from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";
import { DAY_LABELS, DROP_TOKEN_SYMBOL, RADIO_TIERS, STATION_SCHEDULE_CSV_HEADER } from "@/lib/constants";
import { StationTierUpgrade } from "@/components/StationTierUpgrade";
import { StationProSetup } from "@/components/StationProSetup";
import { StationGoLivePanel } from "@/components/StationGoLivePanel";
import { StationEmbedSection } from "@/components/StationEmbedSection";
import { DjUserPicker, type DjSearchResult } from "@/components/DjUserPicker";
import { ProfileImageField } from "@/components/ProfileImageField";
import { STAKING_COPY, STAKING_DEEMPHASIZED } from "@/lib/staking-ui";

interface Resident {
  id: string;
  showTitle: string;
  slotDay: number | null;
  slotHour: number | null;
  slotLabel: string | null;
  dj: { username: string; displayName: string; avatar: string };
}

interface OwnerData {
  station: {
    slug: string;
    name: string;
    tagline: string;
    avatar: string;
    avatarUrl: string;
    bannerUrl: string;
    tier: string;
    tierMeta: {
      label: string;
      maxResidents: number;
      whiteLabel: boolean;
      relayMode: boolean;
      stationDashboard: boolean;
    };
    relayUrl: string | null;
    embedPrimaryColor: string;
    embedHideBranding: boolean;
    flagshipDj: { username: string; displayName: string } | null;
    residents: Resident[];
  };
  stats: {
    totalListeners?: number;
    dropEarned?: number;
    tracksUnlocked?: number;
    showCount?: number;
    followerCount: number;
    totalStaked: number;
    stakerCount: number;
  };
  milestones: Array<{
    key: string;
    label: string;
    threshold: number;
    current: number;
    progress: number;
    claimed: boolean;
    rewardPool: number;
  }>;
  embed: { url: string; snippet: string } | null;
  earnings: { total: number; tipCount: number };
}

export function StationOwnerDashboard() {
  const [data, setData] = useState<OwnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [avatar, setAvatar] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [relayUrl, setRelayUrl] = useState("");
  const [embedColor, setEmbedColor] = useState("#53fc18");
  const [hideBranding, setHideBranding] = useState(false);
  const [flagshipUsername, setFlagshipUsername] = useState("");

  const [newDj, setNewDj] = useState("");
  const [newShow, setNewShow] = useState("");
  const [newSlotDay, setNewSlotDay] = useState("");
  const [newSlotHour, setNewSlotHour] = useState("");
  const [relayVerifyMsg, setRelayVerifyMsg] = useState("");
  const [csvText, setCsvText] = useState("");
  const [importResult, setImportResult] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/api/stations/owner")
      .then(async (res) => {
        if (!res.ok) throw new Error("Not a station owner");
        return res.json();
      })
      .then((d: OwnerData) => {
        setData(d);
        setName(d.station.name);
        setTagline(d.station.tagline);
        setAvatar(d.station.avatar);
        setAvatarUrl(d.station.avatarUrl ?? "");
        setBannerUrl(d.station.bannerUrl ?? "");
        setRelayUrl(d.station.relayUrl ?? "");
        setEmbedColor(d.station.embedPrimaryColor);
        setHideBranding(d.station.embedHideBranding);
        setFlagshipUsername(d.station.flagshipDj?.username ?? "");
      })
      .catch(() => setError("Station dashboard unavailable for this account"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveStation() {
    setSaving(true);
    setError("");
    setMessage("");
    const res = await apiFetch("/api/stations/owner", {
      method: "PATCH",
      body: JSON.stringify({
        name,
        tagline,
        avatar,
        avatarUrl,
        bannerUrl,
        relayUrl: relayUrl || null,
        embedPrimaryColor: embedColor,
        embedHideBranding: hideBranding,
        flagshipDjUsername: flagshipUsername || null,
      }),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(body.error ?? "Save failed");
      return;
    }
    setMessage("Station saved");
    load();
    setTimeout(() => setMessage(""), 2500);
  }

  async function addResident() {
    if (!newDj.trim()) return;
    const res = await apiFetch("/api/stations/owner/residents", {
      method: "POST",
      body: JSON.stringify({
        djUsername: newDj.trim(),
        showTitle: newShow,
        slotDay: newSlotDay !== "" ? Number(newSlotDay) : null,
        slotHour: newSlotHour !== "" ? Number(newSlotHour) : null,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "Could not add resident");
      return;
    }
    setNewDj("");
    setNewShow("");
    setNewSlotDay("");
    setNewSlotHour("");
    load();
  }

  async function verifyRelay() {
    setRelayVerifyMsg("");
    const res = await apiFetch("/api/stations/owner/relay/verify", { method: "POST" });
    const body = await res.json();
    setRelayVerifyMsg(body.ok ? body.message : (body.message ?? body.error ?? "Verify failed"));
  }

  async function removeResident(id: string) {
    const res = await apiFetch(`/api/stations/owner/residents?id=${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function importCsv() {
    setImportResult("");
    const res = await apiFetch("/api/stations/owner/schedule/import", {
      method: "POST",
      body: JSON.stringify({ csv: csvText }),
    });
    const body = await res.json();
    if (!res.ok) {
      setImportResult(body.error ?? "Import failed");
      return;
    }
    const parts = [`Imported ${body.imported} residents`];
    if (body.skipped?.length) parts.push(`Skipped: ${body.skipped.join("; ")}`);
    if (body.parseErrors?.length) parts.push(`Warnings: ${body.parseErrors.join("; ")}`);
    setImportResult(parts.join(" · "));
    load();
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-[#53fc18]/20 bg-[#53fc18]/5 p-8 text-center text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        Loading station dashboard...
      </section>
    );
  }

  if (!data) return null;

  const { station, stats, milestones, embed, earnings } = data;
  const canRelay = station.tierMeta.relayMode;
  const canEmbed = Boolean(embed);
  const isProPlus = station.tier === "pro" || station.tier === "network";

  return (
    <section id="station-dashboard" className="rounded-xl border border-[#53fc18]/20 bg-[#53fc18]/5 p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-lg flex items-center gap-2 text-[#53fc18]">
            <Radio className="h-5 w-5" />
            {station.name}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {station.tierMeta.label} tier · {station.residents.length}/{station.tierMeta.maxResidents} residents
            {station.tagline ? ` · ${station.tagline}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/station/${station.slug}`}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10"
          >
            View channel
            <ExternalLink className="h-3 w-3" />
          </Link>
          <Link
            href={`/station/${station.slug}/live`}
            className="flex items-center gap-1 rounded-lg border border-[#53fc18]/30 bg-[#53fc18]/10 px-3 py-1.5 text-xs font-semibold text-[#53fc18] hover:bg-[#53fc18]/20"
          >
            Live booth
          </Link>
          <Link
            href="/help/stations"
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white"
          >
            <BookOpen className="h-3 w-3" />
            Guide
          </Link>
        </div>
      </div>

      {message && (
        <p className="text-sm text-[#53fc18] border border-[#53fc18]/30 rounded-lg px-3 py-2">{message}</p>
      )}
      {error && (
        <p className="text-sm text-red-400 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
      )}

      <StationGoLivePanel
        stationName={station.name}
        stationSlug={station.slug}
        onStatusChange={load}
      />

      {station.tier === "community" && (
        <StationTierUpgrade currentTier={station.tier} onUpgraded={load} />
      )}

      {isProPlus && (
        <StationProSetup
          stationSlug={station.slug}
          relayUrl={relayUrl}
          embedColor={embedColor}
          embedSnippet={embed?.snippet ?? null}
          embedPreviewUrl={embed?.url ?? null}
          residentCount={station.residents.length}
          onRelayUrlChange={setRelayUrl}
          onEmbedColorChange={setEmbedColor}
          onSaved={load}
        />
      )}

      {station.tier === "community" && (
        <p className="text-xs text-zinc-500 border border-white/10 rounded-lg px-3 py-2">
          <strong className="text-zinc-300">Community tier</strong> — {station.tierMeta.maxResidents}{" "}
          residents and stats dashboard. Enable Pro above for relay, embed, and {RADIO_TIERS.pro.maxResidents}{" "}
          residents.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Followers", value: stats.followerCount, icon: Users },
          { label: "Members", value: stats.stakerCount ?? stats.totalStaked, icon: Target },
          {
            label: "Station tips",
            value: `${Math.round(earnings?.total ?? stats.dropEarned ?? 0)} ${DROP_TOKEN_SYMBOL}`,
            icon: Coins,
          },
          { label: "Peak listeners", value: stats.totalListeners ?? 0, icon: Radio },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-white/10 bg-black/20 p-3">
            <Icon className="h-3.5 w-3.5 text-zinc-500 mb-1" />
            <p className="text-lg font-bold font-mono">{value}</p>
            <p className="text-[10px] text-zinc-500 uppercase">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase text-zinc-500">Channel branding</h3>
        <ProfileImageField
          label="Station logo"
          hint="Square image, shown on your station page and embed player. JPG or PNG recommended."
          value={avatarUrl}
          onChange={setAvatarUrl}
          variant="avatar"
        />
        <ProfileImageField
          label="Station banner"
          hint="Wide cover image at the top of your station page (1600×400 recommended)."
          value={bannerUrl}
          onChange={setBannerUrl}
          variant="banner"
        />
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Station name"
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
          />
          <input
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="Initials fallback (DR)"
            maxLength={4}
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
          />
        </div>
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Tagline"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
        />
        {canRelay ? (
          <div className="space-y-2">
            <input
              value={relayUrl}
              onChange={(e) => setRelayUrl(e.target.value)}
              placeholder="Relay stream URL (Icecast / Radio.co HLS)"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm font-mono text-xs"
            />
            <button
              type="button"
              onClick={verifyRelay}
              className="text-xs text-[#53fc18] hover:underline"
            >
              Verify relay URL is reachable
            </button>
            {relayVerifyMsg && <p className="text-xs text-zinc-500">{relayVerifyMsg}</p>}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Relay mode — upgrade to Pro to simulcast external streams</p>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          {canEmbed ? (
            <div>
              <label className="text-[10px] text-zinc-500 uppercase">Embed accent color</label>
              <input
                type="color"
                value={embedColor}
                onChange={(e) => setEmbedColor(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg cursor-pointer bg-transparent"
              />
            </div>
          ) : (
            <p className="text-xs text-zinc-600 sm:col-span-2">Embed player — Pro tier or higher</p>
          )}
          <div>
            <label className="text-[10px] text-zinc-500 uppercase">Flagship DJ (resident username)</label>
            <select
              value={flagshipUsername}
              onChange={(e) => setFlagshipUsername(e.target.value)}
              className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
            >
              <option value="">None</option>
              {station.residents.map((r) => (
                <option key={r.id} value={r.dj.username}>
                  {r.dj.displayName} (@{r.dj.username})
                </option>
              ))}
            </select>
          </div>
        </div>
        {station.tierMeta.whiteLabel && (
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={hideBranding}
              onChange={(e) => setHideBranding(e.target.checked)}
              className="rounded"
            />
            Hide &quot;Powered by LiveBooth&quot; on embed (Network tier)
          </label>
        )}
        <button
          type="button"
          onClick={saveStation}
          disabled={saving}
          className="rounded-lg bg-[#53fc18] px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save station"}
        </button>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase text-zinc-500">Residents ({station.residents.length})</h3>
        <ul className="space-y-2">
          {station.residents.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
            >
              <span className="font-bold text-xs">{r.dj.avatar}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{r.showTitle || r.dj.displayName}</p>
                <p className="text-xs text-zinc-500">
                  @{r.dj.username}
                  {r.slotDay != null && r.slotHour != null && (
                    <> · {DAY_LABELS[r.slotDay]} {r.slotHour}:00 UTC</>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeResident(r.id)}
                className="text-zinc-500 hover:text-red-400 p-1"
                aria-label="Remove resident"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <DjUserPicker
            value={newDj}
            onChange={setNewDj}
            onSelect={(dj: DjSearchResult) => {
              if (!newShow.trim()) setNewShow(dj.displayName);
            }}
            placeholder="Search DJ username"
            className="flex-1 min-w-[160px]"
          />
          <input
            value={newShow}
            onChange={(e) => setNewShow(e.target.value)}
            placeholder="Show title"
            className="flex-1 min-w-[120px] rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
          />
          <select
            value={newSlotDay}
            onChange={(e) => setNewSlotDay(e.target.value)}
            className="rounded-lg bg-white/5 border border-white/10 px-2 py-2 text-sm"
            aria-label="Slot day UTC"
          >
            <option value="">Day</option>
            {DAY_LABELS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
          <input
            value={newSlotHour}
            onChange={(e) => setNewSlotHour(e.target.value)}
            placeholder="Hour UTC"
            type="number"
            min={0}
            max={23}
            className="w-20 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addResident}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            Add
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase text-zinc-500 flex items-center gap-2">
          <Upload className="h-3.5 w-3.5" />
          Import schedule (CSV)
        </h3>
        <p className="text-[11px] text-zinc-500 font-mono">{STATION_SCHEDULE_CSV_HEADER}</p>
        <p className="text-[11px] text-zinc-600">
          Day: 0–6 or Mon–Sun. Hour: 0–23 UTC. Updates existing residents or adds new ones.
        </p>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={5}
          placeholder={`${STATION_SCHEDULE_CSV_HEADER}\nneonpulse,Techno Hour,1,20,Techno Monday\nbassqueen,Liquid Sessions,Wed,22,DnB Wednesday`}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs font-mono resize-none"
        />
        <button
          type="button"
          onClick={importCsv}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          Import CSV
        </button>
        {importResult && <p className="text-xs text-zinc-400">{importResult}</p>}
      </div>

      {milestones.length > 0 && (
        <details
          className="space-y-2 group"
          open={!STAKING_DEEMPHASIZED}
        >
          <summary className="text-xs font-bold uppercase text-zinc-500 cursor-pointer list-none flex items-center gap-2">
            <span className="group-open:rotate-90 transition-transform inline-block">›</span>
            {STAKING_DEEMPHASIZED ? STAKING_COPY.ownerMilestones : "Member milestones"}
          </summary>
          <div className="space-y-2 pt-1">
            {STAKING_DEEMPHASIZED && (
              <p className="text-[11px] text-zinc-600">
                When your station hits follower and member MRR goals, current members share DROP reward pools.
              </p>
            )}
            {milestones.map((m) => (
              <div key={m.key} className="text-xs">
                <div className="flex justify-between text-zinc-400 mb-0.5">
                  <span className={m.claimed ? "text-[#53fc18]" : ""}>
                    {m.label} ({m.current}/{m.threshold}) {m.claimed && "✓"}
                  </span>
                  <span>{m.rewardPool} DROP pool (split by tier)</span>
                </div>
                <div className="h-1 rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-[#53fc18]/70"
                    style={{ width: `${m.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {embed && (
        <StationEmbedSection
          slug={station.slug}
          stationName={station.name}
          appUrl={embed.url.replace(/\/embed\/station\/[^/]+$/, "")}
        />
      )}
    </section>
  );
}
