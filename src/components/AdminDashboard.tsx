"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/fetch-client";
import {
  Shield,
  Users,
  Radio,
  Flag,
  MessageSquare,
  Loader2,
  StopCircle,
  Megaphone,
  Landmark,
  ScrollText,
  Building2,
} from "lucide-react";
import { SupportTicketAdminCard } from "@/components/AdminSupportTicketCard";

type Tab = "overview" | "users" | "streams" | "archives" | "stations" | "moderation" | "support" | "promotions" | "treasury" | "audit";

type PromotionRow = {
  streamId: string;
  title: string;
  status: string;
  tier: string | null;
  tierLabel: string | null;
  promotedUntil: string | null;
  totalSpent: number;
  peakViewers: number;
  totalTips: number;
  dj: { username: string; displayName: string; avatar: string };
  isLive: boolean;
};

type PromotionsData = {
  heroOccupied: {
    streamId: string;
    title: string;
    djUsername: string;
    djName: string;
    promotedUntil: string | null;
  } | null;
  totalRevenue: number;
  active: PromotionRow[];
  recent: Array<{
    streamId: string;
    title: string;
    status: string;
    tier: string | null;
    totalSpent: number;
    paidAt: string | null;
    dj: { username: string; displayName: string };
    active: boolean;
  }>;
};

type TreasuryData = {
  redeem: { usdCentsPerDrop: number; feeBps: number; minDrop: number };
  inflow: {
    fiatInCents: number;
    dropSoldStripe: number;
    stripePurchaseCount: number;
    devTopUpDrop: number;
  };
  liabilities: { userBalanceDrop: number; totalEarnedDrop: number };
  outflow: {
    paidUsdCents: number;
    paidThisMonthUsdCents: number;
    paidThisMonthCount: number;
  };
  queue: {
    pendingCount: number;
    pendingUsdCents: number;
    approvedCount: number;
    approvedUsdCents: number;
  };
  revenue: { promotionDrop: number };
  recentLedger: Array<{ id: string; type: string; amount: number; username: string; createdAt: string }>;
};

type AdminWithdrawRow = {
  id: string;
  dropAmount: number;
  feeDrop: number;
  netUsdCents: number;
  status: string;
  rejectReason: string | null;
  createdAt: string;
  user: { username: string; displayName: string; email: string; role: string };
};

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [streams, setStreams] = useState<Array<Record<string, unknown>>>([]);
  const [archives, setArchives] = useState<Array<Record<string, unknown>>>([]);
  const [moderation, setModeration] = useState<{
    flagged: unknown[];
    recentReports: unknown[];
    chatMessageReports?: unknown[];
    aiScans?: unknown[];
    ai?: { provider: string; configured: boolean; stopThreshold: number; flagThreshold: number };
  } | null>(null);
  const [tickets, setTickets] = useState<Array<Record<string, unknown>>>([]);
  const [promotions, setPromotions] = useState<PromotionsData | null>(null);
  const [treasury, setTreasury] = useState<TreasuryData | null>(null);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<
    Array<{
      id: string;
      action: string;
      target: string;
      ipAddress: string | null;
      createdAt: string;
      admin: { username: string; displayName: string };
    }>
  >([]);
  const [stations, setStations] = useState<Array<Record<string, unknown>>>([]);
  const [stationSearch, setStationSearch] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [accessError, setAccessError] = useState("");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    username: "",
    email: "",
    displayName: "",
    password: "",
    role: "fan",
  });
  const [showCreateStation, setShowCreateStation] = useState(false);
  const [createStationForm, setCreateStationForm] = useState({
    ownerUsername: "",
    slug: "",
    name: "",
    tagline: "",
    tier: "community",
  });

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: "overview", label: "Overview", icon: Shield },
    { id: "users", label: "Users", icon: Users },
    { id: "streams", label: "Live streams", icon: Radio },
    { id: "archives", label: "Archive", icon: ScrollText },
    { id: "stations", label: "Radio stations", icon: Building2 },
    { id: "promotions", label: "Promotions", icon: Megaphone },
    { id: "treasury", label: "Treasury", icon: Landmark },
    { id: "moderation", label: "Moderation", icon: Flag },
    { id: "support", label: "Support", icon: MessageSquare },
    { id: "audit", label: "Audit log", icon: ScrollText },
  ];

  async function runAiScanAll() {
    setMsg("");
    const res = await apiFetch("/api/admin/moderation", {
      method: "POST",
      body: JSON.stringify({ action: "scan_all" }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(`AI scan complete — ${data.scanned ?? 0} streams checked`);
      loadModeration();
    }
  }

  async function modAction(body: Record<string, string>) {
    return apiFetch("/api/admin/moderation", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async function loadOverview() {
    const res = await apiFetch("/api/admin/stats");
    if (res.ok) {
      setStats(await res.json());
      setAccessError("");
    } else {
      const d = await res.json().catch(() => ({}));
      setAccessError(String(d.error ?? "Could not load admin data — sign in as admin"));
    }
  }

  async function loadUsers(q?: string) {
    const url = q ? `/api/admin/users?q=${encodeURIComponent(q)}` : "/api/admin/users";
    const res = await apiFetch(url);
    if (res.ok) {
      const d = await res.json();
      setUsers(d.users ?? []);
    }
  }

  async function loadArchives() {
    const res = await apiFetch("/api/admin/archives");
    if (res.ok) {
      const d = await res.json();
      setArchives(d.streams ?? []);
    }
  }

  async function deleteArchive(streamId: string, title: string) {
    if (!confirm(`Delete archive "${title}"?`)) return;
    const res = await apiFetch(`/api/streams/${streamId}/archive`, { method: "DELETE" });
    if (res.ok) {
      setMsg("Archive deleted");
      loadArchives();
    }
  }

  async function loadStreams() {
    const res = await apiFetch("/api/admin/streams");
    if (res.ok) {
      const d = await res.json();
      setStreams(d.streams ?? []);
    }
  }

  async function loadModeration() {
    const res = await apiFetch("/api/admin/moderation");
    if (res.ok) setModeration(await res.json());
  }

  async function loadTickets() {
    const res = await apiFetch("/api/admin/support?status=all");
    if (res.ok) {
      const d = await res.json();
      setTickets(d.tickets ?? []);
    }
  }

  async function loadPromotions() {
    const res = await apiFetch("/api/admin/promotions");
    if (res.ok) setPromotions(await res.json());
  }

  async function loadAudit() {
    const res = await apiFetch("/api/admin/audit?limit=100");
    if (res.ok) {
      const d = await res.json();
      setAuditLogs(d.logs ?? []);
    }
  }

  async function loadStations(q?: string) {
    const url = q ? `/api/admin/stations?q=${encodeURIComponent(q)}` : "/api/admin/stations";
    const res = await apiFetch(url);
    if (res.ok) {
      const d = await res.json();
      setStations(d.stations ?? []);
    }
  }

  async function updateStation(stationId: string, tier: string) {
    const res = await apiFetch("/api/admin/stations", {
      method: "PATCH",
      body: JSON.stringify({ stationId, tier }),
    });
    if (res.ok) {
      setMsg("Station tier updated");
      loadStations(stationSearch);
    }
  }

  async function loadTreasury() {
    const [tRes, wRes] = await Promise.all([
      apiFetch("/api/admin/treasury"),
      apiFetch("/api/admin/withdrawals?status=pending"),
    ]);
    if (tRes.ok) setTreasury(await tRes.json());
    if (wRes.ok) {
      const d = await wRes.json();
      setWithdrawals(d.requests ?? []);
    }
  }

  async function withdrawAction(requestId: string, action: "approve" | "reject" | "mark_paid") {
    let rejectReason: string | undefined;
    if (action === "reject") {
      rejectReason = prompt("Rejection reason (DROP refunded):") ?? undefined;
      if (!rejectReason) return;
    }
    const res = await apiFetch("/api/admin/withdrawals", {
      method: "POST",
      body: JSON.stringify({ requestId, action, rejectReason }),
    });
    if (res.ok) {
      setMsg(action === "mark_paid" ? "Marked paid" : action === "approve" ? "Approved" : "Rejected & refunded");
      loadTreasury();
      loadOverview();
    }
  }

  async function cancelPromotion(streamId: string) {
    if (!confirm("Cancel this promotion immediately? (No DROP refund)")) return;
    const res = await apiFetch("/api/admin/promotions", {
      method: "POST",
      body: JSON.stringify({ action: "cancel", streamId }),
    });
    if (res.ok) {
      setMsg("Promotion cancelled");
      loadPromotions();
      loadStreams();
    }
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadOverview(),
      tab === "users" ? loadUsers() : Promise.resolve(),
      tab === "streams" ? loadStreams() : Promise.resolve(),
      tab === "archives" ? loadArchives() : Promise.resolve(),
      tab === "stations" ? loadStations() : Promise.resolve(),
      tab === "promotions" ? loadPromotions() : Promise.resolve(),
      tab === "treasury" ? loadTreasury() : Promise.resolve(),
      tab === "moderation" ? loadModeration() : Promise.resolve(),
      tab === "support" ? loadTickets() : Promise.resolve(),
      tab === "audit" ? loadAudit() : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, [tab]);

  async function stopStream(streamId: string) {
    const reason = prompt("Reason for stopping this stream:");
    if (!reason) return;
    const res = await apiFetch("/api/admin/streams", {
      method: "POST",
      body: JSON.stringify({ streamId, reason }),
    });
    if (res.ok) {
      setMsg("Stream stopped");
      loadStreams();
      loadOverview();
    }
  }

  async function updateUser(userId: string, patch: Record<string, unknown>) {
    const res = await apiFetch("/api/admin/users", {
      method: "PATCH",
      body: JSON.stringify({ userId, ...patch }),
    });
    if (res.ok) {
      setMsg("User updated");
      loadUsers(search);
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiFetch("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(createUserForm),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(`Created @${data.user.username}`);
      setCreateUserForm({ username: "", email: "", displayName: "", password: "", role: "fan" });
      setShowCreateUser(false);
      loadUsers(search);
      loadOverview();
    } else {
      setMsg(String(data.error ?? "Create failed"));
    }
  }

  async function deleteUser(userId: string, username: string) {
    if (!confirm(`Permanently delete @${username}? This cannot be undone.`)) return;
    const res = await apiFetch("/api/admin/users", {
      method: "DELETE",
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(`Deleted @${username}`);
      loadUsers(search);
      loadOverview();
    } else {
      setMsg(String(data.error ?? "Delete failed"));
    }
  }

  async function createStation(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiFetch("/api/admin/stations", {
      method: "POST",
      body: JSON.stringify(createStationForm),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(`Created station /${data.station.slug}`);
      setCreateStationForm({ ownerUsername: "", slug: "", name: "", tagline: "", tier: "community" });
      setShowCreateStation(false);
      loadStations(stationSearch);
      loadOverview();
    } else {
      setMsg(String(data.error ?? "Create failed"));
    }
  }

  async function deleteStation(stationId: string, slug: string) {
    if (!confirm(`Delete station /${slug}? Residents, followers, and stakes will be removed.`)) return;
    const res = await apiFetch("/api/admin/stations", {
      method: "DELETE",
      body: JSON.stringify({ stationId }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(`Deleted /${slug}`);
      loadStations(stationSearch);
      loadOverview();
    } else {
      setMsg(String(data.error ?? "Delete failed"));
    }
  }

  async function updateTicket(ticketId: string, status: string) {
    await apiFetch("/api/admin/support", {
      method: "PATCH",
      body: JSON.stringify({ ticketId, status }),
    });
    loadTickets();
  }

  async function replyToTicket(ticketId: string, body: string) {
    const res = await apiFetch("/api/admin/support/messages", {
      method: "POST",
      body: JSON.stringify({ ticketId, body }),
    });
    if (res.ok) {
      setMsg("Reply sent");
      loadTickets();
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-red-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Admin</h1>
          <p className="text-sm text-zinc-500">Users, streams, moderation &amp; support</p>
        </div>
      </div>

      {accessError && (
        <p className="mb-4 text-sm text-red-400 border border-red-500/30 rounded-lg px-3 py-2">
          {accessError}{" "}
          <a href="/login?next=/admin" className="underline text-red-300">
            Sign in as admin
          </a>
        </p>
      )}

      {msg && (
        <p className="mb-4 text-sm text-[#53fc18] border border-[#53fc18]/30 rounded-lg px-3 py-2">{msg}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); setMsg(""); }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold ${
                tab === t.id
                  ? "bg-red-500/15 border border-red-500/40 text-red-300"
                  : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-16 text-center text-zinc-500">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Loading…
        </div>
      ) : tab === "overview" && !stats ? (
        <p className="text-zinc-500 text-sm py-8 text-center">
          {accessError ? "Admin stats unavailable." : "No stats loaded."}
        </p>
      ) : tab === "overview" && stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Total users", value: stats.users },
            { label: "Live now", value: stats.liveStreams },
            { label: "Open tickets", value: stats.openTickets },
            { label: "Flagged streams", value: stats.flaggedStreams },
            { label: "Reports (24h)", value: stats.reportsToday },
            { label: "Stations", value: stats.stations },
            { label: "Active promos", value: stats.activePromotions ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-[#141416] p-4">
              <p className="text-2xl font-bold font-mono text-white">{value}</p>
              <p className="text-[11px] text-zinc-500 uppercase mt-1">{label}</p>
            </div>
          ))}
        </div>
      ) : tab === "users" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadUsers(search)}
              placeholder="Search username, email…"
              className="flex-1 min-w-[200px] rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowCreateUser((v) => !v)}
              className="rounded-lg bg-[#53fc18] px-4 py-2 text-sm font-bold text-black"
            >
              {showCreateUser ? "Cancel" : "Add user"}
            </button>
          </div>
          {showCreateUser && (
            <form onSubmit={createUser} className="rounded-xl border border-[#53fc18]/30 bg-[#141416] p-4 grid gap-3 sm:grid-cols-2">
              <input required value={createUserForm.username} onChange={(e) => setCreateUserForm((f) => ({ ...f, username: e.target.value }))} placeholder="username" className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" />
              <input required type="email" value={createUserForm.email} onChange={(e) => setCreateUserForm((f) => ({ ...f, email: e.target.value }))} placeholder="email" className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" />
              <input required value={createUserForm.displayName} onChange={(e) => setCreateUserForm((f) => ({ ...f, displayName: e.target.value }))} placeholder="Display name" className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" />
              <input required type="password" minLength={6} value={createUserForm.password} onChange={(e) => setCreateUserForm((f) => ({ ...f, password: e.target.value }))} placeholder="Password (min 6)" className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" />
              <select value={createUserForm.role} onChange={(e) => setCreateUserForm((f) => ({ ...f, role: e.target.value }))} className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm">
                <option value="fan">fan</option>
                <option value="dj">dj</option>
                <option value="station">station</option>
                <option value="admin">admin</option>
              </select>
              <button type="submit" className="rounded-lg bg-[#53fc18] px-4 py-2 text-sm font-bold text-black sm:col-span-2">Create user</button>
            </form>
          )}
          <div className="space-y-2">
            {users.map((u) => (
              <div key={String(u.id)} className="rounded-xl border border-white/10 bg-[#141416] p-4 flex flex-wrap gap-3 items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{String(u.displayName)} <span className="text-zinc-500 font-normal">@{String(u.username)}</span></p>
                  <p className="text-xs text-zinc-500">{String(u.email)} · {String(u.role)}{u.suspendedAt ? " · SUSPENDED" : ""}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    defaultValue={String(u.role)}
                    onChange={(e) => updateUser(String(u.id), { role: e.target.value })}
                    className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-xs"
                  >
                    <option value="fan">fan</option>
                    <option value="dj">dj</option>
                    <option value="station">station</option>
                    <option value="admin">admin</option>
                  </select>
                  {u.suspendedAt ? (
                    <button type="button" onClick={() => updateUser(String(u.id), { suspend: false })} className="text-xs text-[#53fc18] underline">Unsuspend</button>
                  ) : (
                    <button type="button" onClick={() => updateUser(String(u.id), { suspend: true, suspendReason: "Admin suspension" })} className="text-xs text-red-400 underline">Suspend</button>
                  )}
                  <button type="button" onClick={() => deleteUser(String(u.id), String(u.username))} className="text-xs text-red-400 underline">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : tab === "streams" ? (
        <div className="space-y-2">
          {streams.length === 0 ? (
            <p className="text-zinc-500 text-sm">No live streams</p>
          ) : streams.map((s) => {
            const tier = s.promotionTier as string | null;
            const promotedUntil = s.promotedUntil as string | null;
            const promoActive = tier && promotedUntil && new Date(promotedUntil).getTime() > Date.now();
            return (
            <div key={String(s.id)} className="rounded-xl border border-white/10 bg-[#141416] p-4 flex flex-wrap justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">{String(s.title)}</p>
                  {promoActive && (
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      tier === "hero"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-[#53fc18]/15 text-[#53fc18] border border-[#53fc18]/30"
                    }`}>
                      {tier === "hero" ? "Hero sponsored" : "Grid boost"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  @{(s.dj as { username: string }).username}
                  {(s.station as { name: string } | null)?.name
                    ? ` · ${(s.station as { name: string }).name}`
                    : ""}
                  {" · "}{String(s.peakViewers)} peak · {String(s.totalTips)} DROP
                  {" · "}{String(s.reportCount)} reports · {String(s.moderationStatus)}
                </p>
                {promoActive && promotedUntil && (
                  <p className="text-[10px] text-zinc-600 mt-1">
                    Promo until {new Date(promotedUntil).toLocaleTimeString()}
                  </p>
                )}
              </div>
              <button type="button" onClick={() => stopStream(String(s.id))} className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 border border-red-500/40 px-3 py-1.5 text-xs font-bold text-red-300">
                <StopCircle className="h-3.5 w-3.5" /> Stop stream
              </button>
            </div>
          );})}
        </div>
      ) : tab === "archives" ? (
        <div className="space-y-2">
          {archives.length === 0 ? (
            <p className="text-zinc-500 text-sm">No archived sets</p>
          ) : (
            archives.map((s) => {
              const dj = s.dj as { username: string; displayName: string };
              const hasReplay = Boolean(s.hasReplay);
              return (
                <div key={String(s.id)} className="rounded-xl border border-white/10 bg-[#141416] p-4 flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{String(s.title)}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      @{dj.username} · {s.peakViewers != null ? `${s.peakViewers} peak` : ""}
                      {hasReplay ? " · replay available" : " · no replay file"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {hasReplay && (
                      <Link href={`/vod/${String(s.id)}`} className="text-xs text-[#53fc18] underline self-center">
                        Watch
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteArchive(String(s.id), String(s.title))}
                      className="rounded-lg bg-red-500/20 border border-red-500/40 px-3 py-1.5 text-xs font-bold text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : tab === "promotions" ? (
        promotions ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/10 bg-[#141416] p-4">
              <p className="text-2xl font-bold font-mono text-[#53fc18]">{promotions.totalRevenue}</p>
              <p className="text-[11px] text-zinc-500 uppercase mt-1">Total DROP spent</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#141416] p-4">
              <p className="text-2xl font-bold font-mono text-white">{promotions.active.length}</p>
              <p className="text-[11px] text-zinc-500 uppercase mt-1">Active now</p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 col-span-2 sm:col-span-1">
              <p className="text-xs text-amber-300 font-bold uppercase mb-1">Hero slot</p>
              {promotions.heroOccupied ? (
                <p className="text-sm text-white">
                  @{promotions.heroOccupied.djUsername}
                  <span className="text-zinc-500 block text-xs mt-0.5 truncate">{promotions.heroOccupied.title}</span>
                </p>
              ) : (
                <p className="text-sm text-zinc-500">Available</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-zinc-400 uppercase mb-2">Active promotions</h2>
            {promotions.active.length === 0 ? (
              <p className="text-sm text-zinc-500">No active grid or hero boosts.</p>
            ) : (
              <div className="space-y-2">
                {promotions.active.map((p) => (
                  <div key={p.streamId} className="rounded-xl border border-white/10 bg-[#141416] p-4 flex flex-wrap justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          p.tier === "hero"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-[#53fc18]/15 text-[#53fc18]"
                        }`}>
                          {p.tierLabel ?? p.tier}
                        </span>
                        <span className={`text-[10px] uppercase ${p.isLive ? "text-red-400" : "text-zinc-500"}`}>
                          {p.status}{p.isLive ? " · live" : ""}
                        </span>
                      </div>
                      <p className="font-semibold text-white mt-1">{p.title}</p>
                      <p className="text-xs text-zinc-500">
                        @{p.dj.username} · {p.peakViewers} peak · {p.totalSpent} DROP spent
                      </p>
                      {p.promotedUntil && (
                        <p className="text-[10px] text-zinc-600 mt-1">
                          Until {new Date(p.promotedUntil).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => cancelPromotion(p.streamId)}
                      className="text-xs text-red-400 underline self-start"
                    >
                      Cancel promo
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-bold text-zinc-400 uppercase mb-2">Recent purchases</h2>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {promotions.recent.length === 0 ? (
                <p className="text-sm text-zinc-500">No promotion purchases yet.</p>
              ) : (
                promotions.recent.map((p) => (
                  <div key={`${p.streamId}-${p.paidAt}`} className="text-xs border border-white/5 rounded-lg p-2.5 text-zinc-400 flex justify-between gap-2">
                    <span>
                      <span className={p.active ? "text-[#53fc18]" : "text-zinc-500"}>
                        {p.tier ?? "?"} ·
                      </span>
                      {" "}@{p.dj.username} — {p.title}
                      <span className="text-zinc-600 ml-1">({p.totalSpent} DROP)</span>
                    </span>
                    {p.paidAt && (
                      <span className="text-zinc-600 shrink-0">{new Date(p.paidAt).toLocaleDateString()}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <p className="text-xs text-zinc-600">
            Grid boost: 75 DROP / 1h · Hero spotlight: 250 DROP / 1h (one hero at a time). Cancelling removes discover placement immediately; no refund.
          </p>
        </div>
        ) : (
          <p className="text-zinc-500 text-sm py-8 text-center">Loading promotions…</p>
        )
      ) : tab === "treasury" && treasury ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Fiat in (Stripe)", value: `$${(treasury.inflow.fiatInCents / 100).toFixed(0)}` },
              { label: "User balances", value: `${treasury.liabilities.userBalanceDrop.toLocaleString()} DROP` },
              { label: "Paid out", value: `$${(treasury.outflow.paidUsdCents / 100).toFixed(2)}` },
              { label: "Promo revenue", value: `${treasury.revenue.promotionDrop} DROP` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-white/10 bg-[#141416] p-4">
                <p className="text-lg font-bold font-mono text-white">{value}</p>
                <p className="text-[10px] text-zinc-500 uppercase mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-white/10 bg-[#141416] p-4 text-xs text-zinc-400 space-y-1">
            <p>
              Redeem rate: <strong className="text-zinc-200">${(treasury.redeem.usdCentsPerDrop / 100).toFixed(4)}/DROP</strong>
              {" · "}Fee: {treasury.redeem.feeBps / 100}%{" · "}Min: {treasury.redeem.minDrop} DROP
            </p>
            <p>
              Pending queue: {treasury.queue.pendingCount} ({`$${(treasury.queue.pendingUsdCents / 100).toFixed(2)}`})
              {" · "}Approved: {treasury.queue.approvedCount}
              {" · "}This month paid: ${(treasury.outflow.paidThisMonthUsdCents / 100).toFixed(2)}
            </p>
            <p>Dev top-ups: {Math.round(treasury.inflow.devTopUpDrop)} DROP (demo)</p>
          </div>

          <div>
            <h2 className="text-sm font-bold text-zinc-400 uppercase mb-2">Withdrawal queue</h2>
            {withdrawals.length === 0 ? (
              <p className="text-sm text-zinc-500">No pending withdrawal requests.</p>
            ) : (
              <div className="space-y-2">
                {withdrawals.map((w) => (
                  <div key={w.id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">
                        {w.user.displayName} <span className="text-zinc-500 font-normal">@{w.user.username}</span>
                      </p>
                      <p className="text-xs text-zinc-500">
                        {w.dropAmount} DROP · fee {w.feeDrop} · net ${(w.netUsdCents / 100).toFixed(2)} · {w.user.email}
                      </p>
                      <p className="text-[10px] text-zinc-600">{new Date(w.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 self-start">
                      <button type="button" onClick={() => withdrawAction(w.id, "approve")} className="text-xs text-[#53fc18] underline">Approve</button>
                      <button type="button" onClick={() => withdrawAction(w.id, "mark_paid")} className="text-xs text-amber-300 underline">Mark paid</button>
                      <button type="button" onClick={() => withdrawAction(w.id, "reject")} className="text-xs text-red-400 underline">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-bold text-zinc-400 uppercase mb-2">Recent ledger</h2>
            <div className="space-y-1 max-h-48 overflow-y-auto text-xs text-zinc-500">
              {treasury.recentLedger.map((e) => (
                <div key={e.id} className="flex justify-between border-b border-white/5 py-1">
                  <span>@{e.username} · {e.type.replace(/_/g, " ")}</span>
                  <span className={e.amount >= 0 ? "text-[#53fc18]" : "text-red-400"}>{e.amount >= 0 ? "+" : ""}{e.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : tab === "treasury" ? (
        <p className="text-zinc-500 text-sm py-8 text-center">Loading treasury…</p>
      ) : tab === "moderation" && moderation ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <h2 className="text-sm font-bold text-purple-300 uppercase">AI video review</h2>
              <button
                type="button"
                onClick={runAiScanAll}
                className="rounded-lg bg-purple-500/20 border border-purple-500/40 px-3 py-1.5 text-xs font-bold text-purple-200"
              >
                Scan all live streams
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Provider: <strong className="text-zinc-200">{moderation.ai?.provider ?? "mock"}</strong>
              {moderation.ai?.configured ? "" : " (set HIVE_API_KEY or AWS credentials in .env)"}
              {" · "}Stop ≥ {Math.round((moderation.ai?.stopThreshold ?? 0.85) * 100)}% risk
              {" · "}Flag ≥ {Math.round((moderation.ai?.flagThreshold ?? 0.55) * 100)}% risk
            </p>
            <div className="space-y-2 mt-3 max-h-48 overflow-y-auto">
              {(moderation.aiScans ?? []).length === 0 ? (
                <p className="text-xs text-zinc-600">No AI scans yet — runs every 2 min on admin load + on viewer reports</p>
              ) : (
                (moderation.aiScans ?? []).map((scan: unknown) => {
                  const sc = scan as {
                    id: string;
                    provider: string;
                    riskScore: number;
                    action: string;
                    flags: string[];
                    djUsername: string;
                    streamTitle: string;
                    createdAt: string;
                  };
                  return (
                    <div key={sc.id} className="text-xs border border-white/5 rounded-lg p-2 text-zinc-400">
                      <span className={sc.action === "stop" ? "text-red-400 font-bold" : sc.action === "flag" ? "text-amber-400" : "text-zinc-300"}>
                        {sc.action.toUpperCase()}
                      </span>
                      {" · "}
                      {Math.round(sc.riskScore * 100)}% · {sc.provider} · @{sc.djUsername} — {sc.streamTitle}
                      {sc.flags.length > 0 && (
                        <span className="block text-zinc-600 mt-0.5">{sc.flags.slice(0, 3).join(", ")}</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-zinc-400 uppercase mb-2">Flagged live</h2>
            {moderation.flagged.length === 0 ? (
              <p className="text-sm text-zinc-500">No flagged streams</p>
            ) : (
              moderation.flagged.map((s: unknown) => {
                const st = s as { id: string; title: string; reportCount: number };
                return (
                  <div key={st.id} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 mb-2 text-sm">
                    {st.title} — {st.reportCount} reports
                  </div>
                );
              })
            )}
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-400 uppercase mb-2">Chat message reports</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto mb-6">
              {(moderation.chatMessageReports ?? []).length === 0 ? (
                <p className="text-sm text-zinc-500">No pending chat reports</p>
              ) : (
                (moderation.chatMessageReports ?? []).map((r: unknown) => {
                  const rep = r as {
                    id: string;
                    reason: string;
                    messagePreview: string;
                    messageAuthor: string;
                    djUsername: string;
                    reporter: string;
                  };
                  return (
                    <div key={rep.id} className="text-xs border border-white/5 rounded-lg p-3 text-zinc-400 flex justify-between gap-2">
                      <span>
                        <span className="text-zinc-300">{rep.reason}</span> — @{rep.messageAuthor}: &quot;{rep.messagePreview}&quot;
                        <span className="text-zinc-600 ml-1">on @{rep.djUsername} by @{rep.reporter}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => modAction({ action: "dismiss_chat_report", reportId: rep.id }).then(loadModeration)}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300 shrink-0"
                      >
                        Dismiss
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-400 uppercase mb-2">Recent stream reports</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {moderation.recentReports.map((r: unknown) => {
                const rep = r as { id: string; reason: string; djUsername: string; reporter: string; createdAt: string };
                return (
                  <div key={rep.id} className="text-xs border border-white/5 rounded-lg p-3 text-zinc-400">
                    <span className="text-zinc-300">{rep.reason}</span> on @{rep.djUsername} by @{rep.reporter}
                    <span className="text-zinc-600 ml-2">{new Date(rep.createdAt).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-zinc-600">
            Auto-stop: 3+ viewer reports in 15 min · demo feed 45+ min without encoder · AI risk score above threshold (Hive or AWS Rekognition).
          </p>
        </div>
      ) : tab === "support" ? (
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <p className="text-zinc-500 text-sm">No tickets</p>
          ) : tickets.map((t) => {
            const msgs = (t.messages as Array<{ id: string; senderRole: string; body: string; createdAt: string }>) ?? [];
            return (
              <SupportTicketAdminCard
                key={String(t.id)}
                ticket={t}
                messages={msgs}
                onStatusChange={(status) => updateTicket(String(t.id), status)}
                onReply={(body) => replyToTicket(String(t.id), body)}
              />
            );
          })}
        </div>
      ) : tab === "stations" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <input
              value={stationSearch}
              onChange={(e) => setStationSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadStations(stationSearch)}
              placeholder="Search station slug, name, owner…"
              className="flex-1 min-w-[200px] rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowCreateStation((v) => !v)}
              className="rounded-lg bg-[#53fc18] px-4 py-2 text-sm font-bold text-black"
            >
              {showCreateStation ? "Cancel" : "Add station"}
            </button>
          </div>
          {showCreateStation && (
            <form onSubmit={createStation} className="rounded-xl border border-[#53fc18]/30 bg-[#141416] p-4 grid gap-3 sm:grid-cols-2">
              <input required value={createStationForm.ownerUsername} onChange={(e) => setCreateStationForm((f) => ({ ...f, ownerUsername: e.target.value }))} placeholder="Owner username" className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" />
              <input required value={createStationForm.slug} onChange={(e) => setCreateStationForm((f) => ({ ...f, slug: e.target.value }))} placeholder="URL slug" className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" />
              <input required value={createStationForm.name} onChange={(e) => setCreateStationForm((f) => ({ ...f, name: e.target.value }))} placeholder="Station name" className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm sm:col-span-2" />
              <input value={createStationForm.tagline} onChange={(e) => setCreateStationForm((f) => ({ ...f, tagline: e.target.value }))} placeholder="Tagline (optional)" className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm sm:col-span-2" />
              <select value={createStationForm.tier} onChange={(e) => setCreateStationForm((f) => ({ ...f, tier: e.target.value }))} className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm">
                <option value="community">community</option>
                <option value="pro">pro</option>
                <option value="network">network</option>
              </select>
              <button type="submit" className="rounded-lg bg-[#53fc18] px-4 py-2 text-sm font-bold text-black">Create station</button>
            </form>
          )}
          <div className="space-y-2">
            {stations.length === 0 ? (
              <p className="text-zinc-500 text-sm">No stations found.</p>
            ) : (
              stations.map((s) => (
                <div
                  key={String(s.id)}
                  className="rounded-xl border border-white/10 bg-[#141416] p-4 flex flex-wrap gap-3 items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-white">
                      {String(s.name)}{" "}
                      <Link
                        href={`/station/${String(s.slug)}`}
                        className="text-zinc-500 font-normal text-sm hover:text-[#53fc18]"
                      >
                        /{String(s.slug)}
                      </Link>
                    </p>
                    <p className="text-xs text-zinc-500">
                      @{String((s.owner as { username: string }).username)} ·{" "}
                      {String(s.residentCount)} residents · {String(s.followerCount)} followers
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <select
                      defaultValue={String(s.tier)}
                      onChange={(e) => updateStation(String(s.id), e.target.value)}
                      className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-xs"
                    >
                      <option value="community">community</option>
                      <option value="pro">pro</option>
                      <option value="network">network</option>
                    </select>
                    <button type="button" onClick={() => deleteStation(String(s.id), String(s.slug))} className="text-xs text-red-400 underline">Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : tab === "audit" ? (
        <div className="space-y-2 max-h-[70vh] overflow-y-auto">
          {auditLogs.length === 0 ? (
            <p className="text-zinc-500 text-sm">No admin actions logged yet.</p>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-white/5 bg-[#141416] px-3 py-2 text-xs font-mono"
              >
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-zinc-300">
                  <span className="text-[#53fc18]">{log.action}</span>
                  <span>{log.target}</span>
                  <span className="text-zinc-500">by @{log.admin.username}</span>
                  {log.ipAddress && <span className="text-zinc-600">{log.ipAddress}</span>}
                  <span className="text-zinc-600 ml-auto">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
