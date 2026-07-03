"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Save, User, Lock, ExternalLink, Star } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { CREATOR_TYPES, creatorTypeLabels } from "@/lib/constants";
import { GenreMultiPicker } from "@/components/GenrePicker";
import { ScheduleEditor } from "@/components/ScheduleEditor";
import { WebPushToggle } from "@/components/WebPushToggle";
import { StationOwnerSection } from "@/components/StationOwnerSection";
import { SettingsGuide } from "@/components/SettingsGuide";
import { ResetGuidesButton } from "@/components/ResetGuidesButton";
import { ProfileImageField } from "@/components/ProfileImageField";

interface ProfileData {
  displayName: string;
  bio: string;
  avatar: string;
  avatarUrl: string;
  bannerUrl: string;
  username: string;
  email: string;
  role: string;
  creatorType: string;
  genres: string[];
}

export default function SettingsPage() {
  const { user, loading, refresh } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [vipSubs, setVipSubs] = useState<
    Array<{ djUsername: string; djName: string; avatar: string; nextBillingAt: string }>
  >([]);

  useEffect(() => {
    if (!user) {
      setFetching(false);
      return;
    }
    apiFetch("/api/profile")
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load profile");
        const data = await res.json();
        setProfile({
          displayName: data.user.displayName,
          bio: data.user.bio ?? "",
          avatar: data.user.avatar ?? "",
          avatarUrl: data.user.avatarUrl ?? "",
          bannerUrl: data.user.bannerUrl ?? "",
          username: data.user.username,
          email: data.user.email,
          role: data.user.role,
          creatorType: data.user.creatorType ?? "dj",
          genres: data.user.genres ?? [],
        });
      })
      .catch(() => setError("Could not load profile"))
      .finally(() => setFetching(false));

    apiFetch("/api/subscribe", { method: "PUT" })
      .then((r) => (r.ok ? r.json() : { subscriptions: [] }))
      .then((d) => setVipSubs(d.subscriptions ?? []));
  }, [user]);

  function toggleGenre(genre: string) {
    if (!profile) return;
    setProfile((prev) => {
      if (!prev) return prev;
      const has = prev.genres.includes(genre);
      const genres = has
        ? prev.genres.filter((g) => g !== genre)
        : prev.genres.length < 5
          ? [...prev.genres, genre]
          : prev.genres;
      return { ...prev, genres };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError("");
    setMessage("");

    const payload: Record<string, unknown> = {
      displayName: profile.displayName,
      bio: profile.bio,
      avatar: profile.avatar,
      avatarUrl: profile.avatarUrl,
      bannerUrl: profile.bannerUrl,
    };
    if (profile.role === "dj" || profile.role === "admin") {
      payload.genres = profile.genres;
      payload.creatorType = profile.creatorType;
    }
    if (newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    const res = await apiFetch("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Save failed");
      return;
    }

    setMessage("Profile saved");
    setCurrentPassword("");
    setNewPassword("");
    await refresh();
    setTimeout(() => setMessage(""), 3000);
  }

  if (loading || fetching) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
        Loading settings...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-zinc-400 mb-4">Sign in to edit your profile</p>
        <Link href="/login" className="rounded-lg bg-[#53fc18] px-6 py-3 text-sm font-bold text-black">
          Sign in
        </Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-red-400">
        {error || "Profile unavailable"}
      </div>
    );
  }

  const isDj = profile.role === "dj" || profile.role === "admin";
  const isStation = profile.role === "station";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <SettingsGuide />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="h-7 w-7 text-[#53fc18]" />
            Profile settings
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Update how you appear on LiveBooth</p>
        </div>
        <Link
          href={`/dj/${profile.username}`}
          className="flex items-center gap-1 text-sm text-[#53fc18] hover:underline"
        >
          View public profile
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {message && (
          <p className="rounded-lg border border-[#53fc18]/30 bg-[#53fc18]/10 px-4 py-2 text-sm text-[#53fc18]">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <section className="rounded-xl border border-white/5 bg-[#141416] p-6 space-y-4">
          <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wide">Public profile</h2>

          <ProfileImageField
            label="Banner image"
            hint="Wide cover shown at the top of your public profile (1600×400 recommended)."
            value={profile.bannerUrl}
            onChange={(bannerUrl) => setProfile({ ...profile, bannerUrl })}
            variant="banner"
          />

          <ProfileImageField
            label="Profile photo"
            hint="Upload a photo or paste an https:// image URL. Shown on your profile and across LiveBooth."
            value={profile.avatarUrl}
            onChange={(avatarUrl) => setProfile({ ...profile, avatarUrl })}
            variant="avatar"
          />

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Fallback initials (when no photo)</label>
            <input
              value={profile.avatar}
              onChange={(e) => setProfile({ ...profile, avatar: e.target.value })}
              maxLength={8}
              placeholder="NP or 🎧"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Display name</label>
            <input
              value={profile.displayName}
              onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
              required
              maxLength={50}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Bio</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              maxLength={500}
              rows={4}
              placeholder="Tell fans what you play..."
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white resize-none"
            />
            <p className="text-[10px] text-zinc-600 mt-1">{profile.bio.length}/500</p>
          </div>

          {isDj && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Creator type</label>
                <select
                  value={profile.creatorType}
                  onChange={(e) => setProfile({ ...profile, creatorType: e.target.value })}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                >
                  {CREATOR_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {creatorTypeLabels[t]}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-600 mt-1">Shown on your public profile</p>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-2">Genres (up to 5)</label>
                <GenreMultiPicker
                  selected={profile.genres}
                  onToggle={toggleGenre}
                  max={5}
                />
              </div>
            </div>
          )}
        </section>

        {isStation && <StationOwnerSection />}

        {isDj && <ScheduleEditor />}

        <WebPushToggle />

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-zinc-400">Need help using LiveBooth?</p>
            <div className="flex gap-3">
              <Link href="/guide" className="text-[#53fc18] hover:underline">
                Your guide
              </Link>
              <Link href={isStation ? "/help/djs" : isDj ? "/help/djs" : "/help/fans"} className="text-zinc-400 hover:text-white">
                Full docs
              </Link>
              <Link href="/support" className="text-zinc-400 hover:text-white">
                Support
              </Link>
            </div>
          </div>
          <ResetGuidesButton role={profile.role} />
        </div>

        {vipSubs.length > 0 && (
          <section className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-6 space-y-3">
            <h2 className="font-semibold text-sm text-purple-300 uppercase tracking-wide flex items-center gap-2">
              <Star className="h-4 w-4" />
              VIP subscriptions
            </h2>
            <ul className="space-y-2">
              {vipSubs.map((s) => (
                <li key={s.djUsername} className="flex items-center justify-between text-sm">
                  <Link href={`/dj/${s.djUsername}`} className="flex items-center gap-2 hover:text-[#53fc18]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-xs font-bold">
                      {s.avatar}
                    </span>
                    {s.djName}
                  </Link>
                  <span className="text-xs text-zinc-500">
                    renews {new Date(s.nextBillingAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-zinc-600">30% off requests & track IDs on their streams</p>
          </section>
        )}

        <section className="rounded-xl border border-white/5 bg-[#141416] p-6 space-y-4">
          <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wide">Account</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Username</p>
              <p className="text-zinc-300 font-mono">@{profile.username}</p>
              <p className="text-[10px] text-zinc-600 mt-1">Username cannot be changed yet</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Email</p>
              <p className="text-zinc-300">{profile.email}</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-white/5 bg-[#141416] p-6 space-y-4">
          <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wide flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Change password
          </h2>
          <p className="text-xs text-zinc-500">Leave blank to keep your current password</p>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min 6 chars)"
            minLength={6}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
          />
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#53fc18] px-6 py-3 text-sm font-bold text-black disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save changes"}
          </button>
          {isDj ? (
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/10 px-6 py-3 text-sm text-zinc-400 hover:text-white hover:bg-white/5"
            >
              DJ dashboard
            </Link>
          ) : isStation ? (
            <Link
              href="#station-dashboard"
              className="rounded-xl border border-white/10 px-6 py-3 text-sm text-zinc-400 hover:text-white hover:bg-white/5"
            >
              Station dashboard
            </Link>
          ) : (
            <Link
              href="/wallet"
              className="rounded-xl border border-white/10 px-6 py-3 text-sm text-zinc-400 hover:text-white hover:bg-white/5"
            >
              Wallet
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
