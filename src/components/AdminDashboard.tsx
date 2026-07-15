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
  BarChart3,
  Settings,
  Mail,
  Copy,
} from "lucide-react";
import { SupportTicketAdminCard } from "@/components/AdminSupportTicketCard";
import { AdminAnalyticsPanel } from "@/components/admin/AdminAnalyticsPanel";
import { AdminSettingsPanel } from "@/components/admin/AdminSettingsPanel";
import { AdminStationResidents } from "@/components/admin/AdminStationResidents";
import { DjArchiveList, type ArchiveStream } from "@/components/DjArchiveList";
import { generateInvitePassword } from "@/lib/invite-password";
import { formatBetaInviteText, inviteRoleLabel } from "@/lib/invite-copy";
import { ModeratorPermissionsEditor } from "@/components/admin/ModeratorPermissionsEditor";
import {
  DEFAULT_MODERATOR_PERMISSIONS,
  hasModeratorPermission,
  moderatorCanAccessTab,
  MODERATOR_PERMISSIONS,
  type ModeratorPermissionId,
  isProtectedStaffTarget,
} from "@/lib/staff-roles";

type PendingInvite = {
  userId: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  tempPassword: string;
};

type Tab = "overview" | "analytics" | "users" | "streams" | "archives" | "stations" | "moderation" | "support" | "promotions" | "treasury" | "settings" | "audit";

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
  onChain?: {
    treasuryBalanceDrop: number;
    totalSupplyDrop: number;
    treasuryAddress: string;
    explorerTreasuryUrl: string;
  } | null;
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
  user: { username: string; displayName: string; email: string; role: string; stripeConnectOnboarded?: boolean };
};

export function AdminDashboard({
  isFullAdmin,
  moderatorPermissions = DEFAULT_MODERATOR_PERMISSIONS,
  emailConfigured = false,
}: {
  isFullAdmin: boolean;
  moderatorPermissions?: ModeratorPermissionId[];
  emailConfigured?: boolean;
}) {
  const [tab, setTab] = useState<Tab>(() => {
    if (isFullAdmin) return "overview";
    const order: Tab[] = [
      "overview",
      "users",
      "streams",
      "archives",
      "stations",
      "moderation",
      "support",
    ];
    for (const id of order) {
      if (moderatorCanAccessTab("moderator", moderatorPermissions, id)) return id;
    }
    return "moderation";
  });
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
  const [supportAdmins, setSupportAdmins] = useState<
    Array<{ id: string; username: string; displayName: string }>
  >([]);
  const [supportStatusTab, setSupportStatusTab] = useState<"open" | "closed">("open");
  const [supportFilter, setSupportFilter] = useState<"all" | "me" | "unassigned">("all");
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
    moderatorPermissions: [...DEFAULT_MODERATOR_PERMISSIONS] as ModeratorPermissionId[],
  });
  const [showCreateStation, setShowCreateStation] = useState(false);
  const [createStationForm, setCreateStationForm] = useState({
    ownerUsername: "",
    slug: "",
    name: "",
    tagline: "",
    tier: "community",
  });

  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ email: "", displayName: "", balanceAdjust: "", setPassword: "" });
  const [transferStation, setTransferStation] = useState<{ id: string; slug: string } | null>(null);
  const [transferUsername, setTransferUsername] = useState("");
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
  const [emailConfiguredState, setEmailConfigured] = useState<boolean | null>(
    emailConfigured ? true : null,
  );
  const [signupEnabled, setSignupEnabled] = useState<boolean | null>(null);
  const [sendingInviteId, setSendingInviteId] = useState<string | null>(null);
  const [editingModPermsUserId, setEditingModPermsUserId] = useState<string | null>(null);
  const [modPermsDraft, setModPermsDraft] = useState<ModeratorPermissionId[]>([
    ...DEFAULT_MODERATOR_PERMISSIONS,
  ]);

  const hasPerm = (perm: ModeratorPermissionId) =>
    isFullAdmin || hasModeratorPermission("moderator", moderatorPermissions, perm);

  const canAccessTab = (tabId: string) =>
    isFullAdmin || moderatorCanAccessTab("moderator", moderatorPermissions, tabId);

  const allTabs: { id: Tab; label: string; icon: typeof Shield; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: Shield },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "streams", label: "Live streams", icon: Radio },
    { id: "archives", label: "Archive", icon: ScrollText },
    { id: "stations", label: "Radio stations", icon: Building2 },
    { id: "promotions", label: "Promotions", icon: Megaphone },
    { id: "treasury", label: "Treasury", icon: Landmark },
    { id: "moderation", label: "Moderation", icon: Flag },
    { id: "support", label: "Support", icon: MessageSquare, badge: stats?.unreadSupport as number | undefined },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "audit", label: "Audit log", icon: ScrollText },
  ];

  const tabs = isFullAdmin ? allTabs : allTabs.filter((t) => canAccessTab(t.id));

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

  async function loadTickets(
    statusTab: "open" | "closed" = supportStatusTab,
    assignee: "all" | "me" | "unassigned" = supportFilter,
  ) {
    const params = new URLSearchParams({ status: statusTab });
    if (assignee !== "all") params.set("assignee", assignee);
    const res = await apiFetch(`/api/admin/support?${params}`);
    if (res.ok) {
      const d = await res.json();
      setTickets(d.tickets ?? []);
      setSupportAdmins(d.admins ?? []);
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
    if (isFullAdmin) return;
    if (!canAccessTab(tab)) {
      const first = (tabs[0]?.id ?? "moderation") as Tab;
      setTab(first);
    }
  }, [isFullAdmin, tab, moderatorPermissions]);

  useEffect(() => {
    if (!isFullAdmin) return;
    apiFetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setSignupEnabled(d.settings?.signupEnabled ?? true);
        setEmailConfigured(d.emailConfigured ?? false);
      })
      .catch(() => {});
  }, [isFullAdmin]);

  useEffect(() => {
    const onArchivesUpdated = () => {
      if (tab === "archives") void loadArchives();
    };
    window.addEventListener("livebooth:archives-updated", onArchivesUpdated);
    return () => window.removeEventListener("livebooth:archives-updated", onArchivesUpdated);
  }, [tab]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      hasPerm("overview") ? loadOverview() : Promise.resolve(),
      tab === "users" ? loadUsers() : Promise.resolve(),
      tab === "streams" ? loadStreams() : Promise.resolve(),
      tab === "archives" ? loadArchives() : Promise.resolve(),
      tab === "stations" ? loadStations() : Promise.resolve(),
      tab === "promotions" ? loadPromotions() : Promise.resolve(),
      tab === "treasury" ? loadTreasury() : Promise.resolve(),
      tab === "moderation" ? loadModeration() : Promise.resolve(),
      tab === "support" ? loadTickets() : Promise.resolve(),
      tab === "audit" ? loadAudit() : Promise.resolve(),
      tab === "analytics" ? Promise.resolve() : Promise.resolve(),
      tab === "settings" ? Promise.resolve() : Promise.resolve(),
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

  async function saveModeratorPermissions(userId: string) {
    const res = await apiFetch("/api/admin/users", {
      method: "PATCH",
      body: JSON.stringify({ userId, moderatorPermissions: modPermsDraft }),
    });
    if (res.ok) {
      setMsg("Moderator permissions saved");
      setEditingModPermsUserId(null);
      loadUsers(search);
    } else {
      const data = await res.json();
      setMsg(String(data.error ?? "Could not save permissions"));
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
    const password = createUserForm.password.trim() || generateInvitePassword();
    const res = await apiFetch("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ ...createUserForm, password }),
    });
    const data = await res.json();
    if (res.ok) {
      const pw = data.user.tempPassword ?? password;
      setPendingInvite({
        userId: data.user.id,
        username: data.user.username,
        email: data.user.email,
        displayName: data.user.displayName,
        role: data.user.role,
        tempPassword: pw,
      });
      setMsg(`Created @${data.user.username} (${inviteRoleLabel(data.user.role)})`);
      setCreateUserForm({
        username: "",
        email: "",
        displayName: "",
        password: "",
        role: "fan",
        moderatorPermissions: [...DEFAULT_MODERATOR_PERMISSIONS],
      });
      setShowCreateUser(false);
      loadUsers(search);
      loadOverview();
    } else {
      setMsg(String(data.error ?? "Create failed"));
    }
  }

  function openCreateUserForm() {
    setShowCreateUser((open) => {
      if (open) return false;
      setCreateUserForm({
        username: "",
        email: "",
        displayName: "",
        password: generateInvitePassword(),
        role: "fan",
        moderatorPermissions: [...DEFAULT_MODERATOR_PERMISSIONS],
      });
      return true;
    });
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

  async function markTicketRead(ticketId: string) {
    await apiFetch("/api/admin/support/mark-read", {
      method: "POST",
      body: JSON.stringify({ ticketId }),
    });
    loadOverview();
    loadTickets();
  }

  async function assignTicket(ticketId: string, assignedAdminId: string | null) {
    const res = await apiFetch("/api/admin/support", {
      method: "PATCH",
      body: JSON.stringify({ ticketId, assignedAdminId }),
    });
    if (res.ok) {
      setMsg(assignedAdminId ? "Ticket assigned" : "Ticket unassigned");
      loadTickets();
    }
  }

  async function saveUserEdit(userId: string) {
    const patch: Record<string, unknown> = {
      userId,
      email: editForm.email,
      displayName: editForm.displayName,
    };
    if (editForm.balanceAdjust.trim()) {
      patch.balanceAdjust = Number(editForm.balanceAdjust);
    }
    if (editForm.setPassword.trim()) {
      patch.setPassword = editForm.setPassword;
    }
    const res = await apiFetch("/api/admin/users", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      setMsg("User updated");
      setEditingUser(null);
      loadUsers(search);
    }
  }

  async function sendUserPasswordReset(userId: string) {
    const res = await apiFetch("/api/admin/users", {
      method: "PATCH",
      body: JSON.stringify({ userId, sendPasswordReset: true }),
    });
    if (res.ok) setMsg("Password reset email sent");
    else {
      const d = await res.json().catch(() => ({}));
      setMsg(String(d.error ?? "Password reset failed"));
    }
  }

  async function copyInviteText(invite: PendingInvite) {
    const text = formatBetaInviteText({
      displayName: invite.displayName,
      email: invite.email,
      tempPassword: invite.tempPassword,
      role: invite.role,
    });
    await navigator.clipboard.writeText(text);
    setMsg("Invite copied to clipboard");
  }

  async function sendInvite(opts: {
    userId: string;
    tempPassword?: string;
    displayName?: string;
    email?: string;
    regenerate?: boolean;
  }) {
    setSendingInviteId(opts.userId);
    const regenerate = opts.regenerate ?? !opts.tempPassword;
    const res = await apiFetch("/api/admin/users/invite", {
      method: "POST",
      body: JSON.stringify({
        userId: opts.userId,
        tempPassword: opts.tempPassword,
        regeneratePassword: regenerate ? undefined : false,
      }),
    });
    const data = await res.json();
    setSendingInviteId(null);
    if (res.ok) {
      setMsg(`Invite email sent to ${data.email}`);
      if (pendingInvite?.userId === opts.userId && data.tempPassword) {
        setPendingInvite((p) => (p ? { ...p, tempPassword: data.tempPassword } : p));
      }
    } else {
      setMsg(String(data.error ?? "Invite failed"));
    }
  }

  async function sendInviteFromRow(userId: string, email: string) {
    if (!confirm(`Send invite email to ${email}? This sets a fresh temp password.`)) return;
    await sendInvite({ userId, regenerate: true });
  }

  async function transferStationOwner(stationId: string) {
    if (!transferUsername.trim()) return;
    const res = await apiFetch("/api/admin/stations", {
      method: "PATCH",
      body: JSON.stringify({ stationId, transferToUsername: transferUsername }),
    });
    if (res.ok) {
      setMsg("Ownership transferred");
      setTransferStation(null);
      setTransferUsername("");
      loadStations(stationSearch);
    }
  }

  async function replyToTicket(ticketId: string, body: string) {
    const res = await apiFetch("/api/admin/support/messages", {
      method: "POST",
      body: JSON.stringify({ ticketId, body }),
    });
    if (res.ok) {
      setMsg("Reply sent");
      loadTickets();
      loadOverview();
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-red-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">{isFullAdmin ? "Admin" : "Mod panel"}</h1>
          <p className="text-sm text-zinc-500">
            {isFullAdmin ? "Users, streams, moderation & support" : "Streams, moderation, support & user suspensions"}
          </p>
        </div>
      </div>

      {accessError && (
        <p className="mb-4 text-sm text-red-400 border border-red-500/30 rounded-lg px-3 py-2">
          {accessError}{" "}
          <a href="/login?next=/admin" className="underline text-red-300">
            Sign in as staff
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
              {t.badge != null && t.badge > 0 && (
                <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {t.badge > 99 ? "99+" : t.badge}
                </span>
              )}
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
            ...(isFullAdmin ? [{ label: "Total users", value: stats.users }] : []),
            { label: "Live now", value: stats.liveStreams },
            { label: "Open tickets", value: stats.openTickets },
            { label: "Unread support", value: stats.unreadSupport ?? 0 },
            { label: "Flagged streams", value: stats.flaggedStreams },
            { label: "Reports (24h)", value: stats.reportsToday },
            ...(isFullAdmin
              ? [
                  { label: "Stations", value: stats.stations },
                  { label: "Active promos", value: stats.activePromotions ?? 0 },
                ]
              : []),
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-[#141416] p-4">
              <p className="text-2xl font-bold font-mono text-white">{value}</p>
              <p className="text-[11px] text-zinc-500 uppercase mt-1">{label}</p>
            </div>
          ))}
        </div>
      ) : tab === "analytics" ? (
        <AdminAnalyticsPanel />
      ) : tab === "settings" ? (
        <AdminSettingsPanel onMsg={setMsg} />
      ) : tab === "users" ? (
        <div className="space-y-4">
          {!isFullAdmin && (
            <p className="text-xs text-zinc-500 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              Moderator view — tabs and actions depend on permissions assigned by an admin.
              {" "}
              Your access: {moderatorPermissions.map((p) => MODERATOR_PERMISSIONS.find((m) => m.id === p)?.label ?? p).join(", ")}.
            </p>
          )}
          {isFullAdmin && signupEnabled === false && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200/90">
              <strong>Closed beta</strong> — public signup is off. Add users here and send invites below.
              {emailConfiguredState === false && (
                <span className="block mt-1 text-amber-300/80">
                  Email not configured — set RESEND_API_KEY and EMAIL_FROM on Vercel to use Send invite.
                </span>
              )}
            </div>
          )}
          {isFullAdmin && emailConfiguredState === true && signupEnabled !== false && (
            <p className="text-xs text-zinc-500">
              Invite emails ready (Resend configured). Turn off signup in Settings for a closed beta.
            </p>
          )}
          <div className="flex flex-wrap gap-2 items-center justify-between">
            {hasPerm("users_search") ? (
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadUsers(search)}
              placeholder="Search username, email…"
              className="flex-1 min-w-[200px] rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
            />
            ) : (
            <p className="text-xs text-zinc-500">Recent users — search requires the Search users permission.</p>
            )}
            {hasPerm("users_create") && (
            <button
              type="button"
              onClick={openCreateUserForm}
              className="rounded-lg bg-[#53fc18] px-4 py-2 text-sm font-bold text-black"
            >
              {showCreateUser ? "Cancel" : "Add user"}
            </button>
            )}
          </div>
          {hasPerm("users_create") && showCreateUser && (
            <form onSubmit={createUser} className="rounded-xl border border-[#53fc18]/30 bg-[#141416] p-4 grid gap-3 sm:grid-cols-2">
              <input required value={createUserForm.username} onChange={(e) => setCreateUserForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))} placeholder="username" className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" />
              <input required type="email" value={createUserForm.email} onChange={(e) => setCreateUserForm((f) => ({ ...f, email: e.target.value }))} placeholder="email" className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" />
              <input required value={createUserForm.displayName} onChange={(e) => setCreateUserForm((f) => ({ ...f, displayName: e.target.value }))} placeholder="Display name" className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" />
              <div className="flex gap-2">
                <input
                  required
                  type="text"
                  minLength={6}
                  value={createUserForm.password}
                  onChange={(e) => setCreateUserForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Auto-generated password"
                  className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setCreateUserForm((f) => ({ ...f, password: generateInvitePassword() }))}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 shrink-0"
                >
                  New
                </button>
              </div>
              <select value={createUserForm.role} onChange={(e) => setCreateUserForm((f) => ({ ...f, role: e.target.value }))} className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm">
                <option value="fan">Fan</option>
                <option value="dj">DJ</option>
                <option value="station">Radio</option>
                {isFullAdmin && <option value="moderator">Moderator</option>}
                {isFullAdmin && <option value="admin">Admin</option>}
              </select>
              {isFullAdmin && createUserForm.role === "moderator" && (
                <div className="sm:col-span-2">
                  <ModeratorPermissionsEditor
                    value={createUserForm.moderatorPermissions}
                    onChange={(moderatorPermissions) =>
                      setCreateUserForm((f) => ({ ...f, moderatorPermissions }))
                    }
                  />
                </div>
              )}
              <p className="text-xs text-zinc-500 sm:col-span-2">
                After creating, use <strong className="text-zinc-400">Send invite</strong> to email login details, or copy the invite text manually.
              </p>
              <button type="submit" className="rounded-lg bg-[#53fc18] px-4 py-2 text-sm font-bold text-black sm:col-span-2">Create user</button>
            </form>
          )}
          {hasPerm("users_invite") && pendingInvite && (
            <div className="rounded-xl border border-[#53fc18]/40 bg-[#53fc18]/5 p-4 space-y-3">
              <div>
                <p className="font-semibold text-white">
                  Invite ready — @{pendingInvite.username}{" "}
                  <span className="text-zinc-400 font-normal">({inviteRoleLabel(pendingInvite.role)})</span>
                </p>
                <p className="text-xs text-zinc-500 mt-1">{pendingInvite.email}</p>
                <p className="text-sm font-mono text-[#53fc18] mt-2">{pendingInvite.tempPassword}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyInviteText(pendingInvite)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy invite
                </button>
                <button
                  type="button"
                  disabled={!emailConfiguredState || sendingInviteId === pendingInvite.userId}
                  onClick={() =>
                    sendInvite({
                      userId: pendingInvite.userId,
                      tempPassword: pendingInvite.tempPassword,
                      regenerate: false,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#53fc18] px-3 py-2 text-xs font-bold text-black disabled:opacity-40"
                >
                  {sendingInviteId === pendingInvite.userId ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Mail className="h-3.5 w-3.5" />
                  )}
                  Send invite email
                </button>
                <button
                  type="button"
                  onClick={() => setPendingInvite(null)}
                  className="rounded-lg px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {users.map((u) => {
              const userRole = String(u.role);
              const protectedStaff = isProtectedStaffTarget(userRole);
              return (
              <div key={String(u.id)} className="rounded-xl border border-white/10 bg-[#141416] p-4 flex flex-wrap gap-3 items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{String(u.displayName)} <span className="text-zinc-500 font-normal">@{String(u.username)}</span></p>
                  <p className="text-xs text-zinc-500">{String(u.email)} · {inviteRoleLabel(String(u.role))} · {String(u.balance)} DROP{u.suspendedAt ? " · SUSPENDED" : ""}</p>
                  {u.createdAt ? (
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      Signed up {new Date(String(u.createdAt)).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {isFullAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUser(editingUser === String(u.id) ? null : String(u.id));
                      setEditForm({
                        email: String(u.email),
                        displayName: String(u.displayName),
                        balanceAdjust: "",
                        setPassword: "",
                      });
                    }}
                    className="text-xs text-zinc-400 underline"
                  >
                    Edit
                  </button>
                  )}
                  {isFullAdmin && userRole === "moderator" && (
                    <button
                      type="button"
                      onClick={() => {
                        const perms = (u.moderatorPermissions as ModeratorPermissionId[] | undefined) ?? [
                          ...DEFAULT_MODERATOR_PERMISSIONS,
                        ];
                        if (editingModPermsUserId === String(u.id)) {
                          setEditingModPermsUserId(null);
                        } else {
                          setEditingModPermsUserId(String(u.id));
                          setModPermsDraft(perms);
                        }
                      }}
                      className="text-xs text-purple-300 underline"
                    >
                      {editingModPermsUserId === String(u.id) ? "Close permissions" : "Permissions"}
                    </button>
                  )}
                  {hasPerm("users_invite") && (
                  <button
                    type="button"
                    disabled={!emailConfiguredState || sendingInviteId === String(u.id)}
                    onClick={() => sendInviteFromRow(String(u.id), String(u.email))}
                    className="inline-flex items-center gap-1 text-xs text-[#53fc18] underline disabled:opacity-40 disabled:no-underline"
                  >
                    {sendingInviteId === String(u.id) ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Mail className="h-3 w-3" />
                    )}
                    Send invite
                  </button>
                  )}
                  {isFullAdmin && (
                  <select
                    defaultValue={userRole}
                    onChange={(e) => updateUser(String(u.id), { role: e.target.value })}
                    className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-xs"
                  >
                    <option value="fan">Fan</option>
                    <option value="dj">DJ</option>
                    <option value="station">Radio</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                  )}
                  {(!protectedStaff || isFullAdmin) && hasPerm("users_suspend") && (
                    u.suspendedAt ? (
                      <button type="button" onClick={() => updateUser(String(u.id), { suspend: false })} className="text-xs text-[#53fc18] underline">Unsuspend</button>
                    ) : (
                      <button type="button" onClick={() => updateUser(String(u.id), { suspend: true, suspendReason: isFullAdmin ? "Admin suspension" : "Moderator suspension" })} className="text-xs text-red-400 underline">Suspend</button>
                    )
                  )}
                  {isFullAdmin && (
                  <button type="button" onClick={() => deleteUser(String(u.id), String(u.username))} className="text-xs text-red-400 underline">Delete</button>
                  )}
                </div>
                {isFullAdmin && editingUser === String(u.id) && (
                  <div className="w-full mt-3 pt-3 border-t border-white/10 grid gap-2 sm:grid-cols-2">
                    <input value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-xs" placeholder="Email" />
                    <input value={editForm.displayName} onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))} className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-xs" placeholder="Display name" />
                    <input value={editForm.balanceAdjust} onChange={(e) => setEditForm((f) => ({ ...f, balanceAdjust: e.target.value }))} className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-xs" placeholder="Balance adjust (+/- DROP)" />
                    <input value={editForm.setPassword} onChange={(e) => setEditForm((f) => ({ ...f, setPassword: e.target.value }))} className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-xs" placeholder="Set new password" />
                    <div className="sm:col-span-2 flex flex-wrap gap-3">
                      <button type="button" onClick={() => saveUserEdit(String(u.id))} className="text-xs text-[#53fc18] underline">Save</button>
                      <button type="button" onClick={() => sendUserPasswordReset(String(u.id))} className="text-xs text-zinc-400 underline">Email password reset</button>
                    </div>
                  </div>
                )}
                {isFullAdmin && editingModPermsUserId === String(u.id) && (
                  <div className="w-full mt-3 pt-3 border-t border-white/10 space-y-3">
                    <ModeratorPermissionsEditor
                      value={modPermsDraft}
                      onChange={setModPermsDraft}
                    />
                    <button
                      type="button"
                      onClick={() => saveModeratorPermissions(String(u.id))}
                      className="text-xs text-[#53fc18] underline"
                    >
                      Save permissions
                    </button>
                  </div>
                )}
              </div>
            );
            })}
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
              {hasPerm("streams_stop") && (
              <button type="button" onClick={() => stopStream(String(s.id))} className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 border border-red-500/40 px-3 py-1.5 text-xs font-bold text-red-300">
                <StopCircle className="h-3.5 w-3.5" /> Stop stream
              </button>
              )}
            </div>
          );})}
        </div>
      ) : tab === "archives" ? (
        <DjArchiveList
          variant="admin"
          canDelete
          streams={archives.map((s) => {
            const dj = s.dj as { username: string; displayName: string };
            return {
              id: String(s.id),
              title: String(s.title),
              genre: "other",
              peakViewers: Number(s.peakViewers ?? 0),
              totalTips: Number(s.totalTips ?? 0),
              setGrade: null,
              setScore: null,
              startedAt: null,
              endedAt: s.endedAt ? new Date(String(s.endedAt)) : null,
              vodUrl: s.vodUrl ? String(s.vodUrl) : null,
              playbackUrl: s.playbackUrl ? String(s.playbackUrl) : null,
              hasReplay: Boolean(s.hasReplay),
              dj,
            } satisfies ArchiveStream;
          })}
        />
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
            <p>
              <Link href="/transparency" className="text-[#53fc18] hover:underline">
                Public transparency page →
              </Link>
            </p>
          </div>

          {treasury.onChain && (
            <div className="rounded-xl border border-[#53fc18]/20 bg-[#53fc18]/5 p-4 text-xs text-zinc-400 space-y-1">
              <p className="font-semibold text-[#53fc18]">On-chain treasury (TipRouter 10% fees)</p>
              <p>
                Balance: <strong className="text-white">{treasury.onChain.treasuryBalanceDrop.toLocaleString()} DROP</strong>
                {" · "}Supply: {treasury.onChain.totalSupplyDrop.toLocaleString()} DROP
              </p>
              <a
                href={treasury.onChain.explorerTreasuryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#53fc18] hover:underline inline-block"
              >
                View treasury wallet on explorer →
              </a>
            </div>
          )}

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
                        {w.user.stripeConnectOnboarded ? (
                          <span className="text-sky-400/80"> · Stripe connected</span>
                        ) : (
                          <span className="text-amber-500/80"> · manual payout</span>
                        )}
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
          <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
            {(["open", "closed"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSupportStatusTab(s);
                  loadTickets(s, supportFilter);
                }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  supportStatusTab === s
                    ? "bg-red-500/15 border border-red-500/40 text-red-300"
                    : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
                }`}
              >
                {s === "open" ? "Open" : "Closed"}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-zinc-500 uppercase font-semibold">Assignee</span>
            {(["all", "me", "unassigned"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setSupportFilter(f);
                  loadTickets(supportStatusTab, f);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  supportFilter === f
                    ? "bg-white/10 border border-white/20 text-white"
                    : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
                }`}
              >
                {f === "all" ? "All" : f === "me" ? "Assigned to me" : "Unassigned"}
              </button>
            ))}
          </div>
          {tickets.length === 0 ? (
            <p className="text-zinc-500 text-sm">
              No {supportStatusTab === "open" ? "open" : "closed"} tickets
              {supportFilter !== "all" ? " for this filter" : ""}
            </p>
          ) : tickets.map((t) => {
            const msgs = (t.messages as Array<{ id: string; senderRole: string; body: string; createdAt: string }>) ?? [];
            return (
              <SupportTicketAdminCard
                key={String(t.id)}
                ticket={t}
                messages={msgs}
                admins={supportAdmins}
                unread={Boolean(t.unread)}
                onOpen={() => markTicketRead(String(t.id))}
                onStatusChange={(status) => updateTicket(String(t.id), status)}
                onAssign={(assignedAdminId) => assignTicket(String(t.id), assignedAdminId)}
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
            {hasPerm("stations_create") && (
            <button
              type="button"
              onClick={() => setShowCreateStation((v) => !v)}
              className="rounded-lg bg-[#53fc18] px-4 py-2 text-sm font-bold text-black"
            >
              {showCreateStation ? "Cancel" : "Add station"}
            </button>
            )}
          </div>
          {hasPerm("stations_create") && showCreateStation && (
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
                    {isFullAdmin && (
                    <AdminStationResidents
                      stationId={String(s.id)}
                      stationSlug={String(s.slug)}
                      onMsg={setMsg}
                    />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {isFullAdmin && (
                    <select
                      defaultValue={String(s.tier)}
                      onChange={(e) => updateStation(String(s.id), e.target.value)}
                      className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-xs"
                    >
                      <option value="community">community</option>
                      <option value="pro">pro</option>
                      <option value="network">network</option>
                    </select>
                    )}
                    {isFullAdmin && (
                    <button
                      type="button"
                      onClick={() => setTransferStation({ id: String(s.id), slug: String(s.slug) })}
                      className="text-xs text-zinc-400 underline"
                    >
                      Transfer
                    </button>
                    )}
                    {isFullAdmin && (
                    <button type="button" onClick={() => deleteStation(String(s.id), String(s.slug))} className="text-xs text-red-400 underline">Delete</button>
                    )}
                  </div>
                  {transferStation?.id === String(s.id) && (
                    <div className="w-full flex gap-2 mt-2 pt-2 border-t border-white/10">
                      <input
                        value={transferUsername}
                        onChange={(e) => setTransferUsername(e.target.value)}
                        placeholder="New owner username"
                        className="flex-1 rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-xs"
                      />
                      <button type="button" onClick={() => transferStationOwner(String(s.id))} className="text-xs text-[#53fc18] underline">Confirm</button>
                    </div>
                  )}
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
