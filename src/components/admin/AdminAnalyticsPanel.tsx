"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch-client";
import { Loader2 } from "lucide-react";

type Analytics = {
  users: { total: number; newToday: number; newWeek: number; newMonth: number; activeSessions24h: number };
  streams: { liveNow: number; startedToday: number; startedWeek: number; hoursWeek: number };
  tips: { todayDrop: number; todayCount: number; weekDrop: number; weekCount: number; monthDrop: number; monthCount: number };
  support: { openTickets: number; unreadTickets: number };
  stations: { total: number };
  treasury: { pendingWithdrawals: number };
};

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#141416] p-4">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

export function AdminAnalyticsPanel() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#53fc18]" />
      </div>
    );
  }
  if (!data) return <p className="text-zinc-500 text-sm">Could not load analytics.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Users</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total users" value={data.users.total} />
          <Stat label="New today" value={data.users.newToday} />
          <Stat label="New this week" value={data.users.newWeek} />
          <Stat label="Sessions (24h)" value={data.users.activeSessions24h} sub="proxy for activity" />
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Streams</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Live now" value={data.streams.liveNow} />
          <Stat label="Started today" value={data.streams.startedToday} />
          <Stat label="Started this week" value={data.streams.startedWeek} />
          <Stat label="Stream hours (week)" value={data.streams.hoursWeek} />
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Tips (DROP)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat label="Today" value={Math.round(data.tips.todayDrop)} sub={`${data.tips.todayCount} tips`} />
          <Stat label="This week" value={Math.round(data.tips.weekDrop)} sub={`${data.tips.weekCount} tips`} />
          <Stat label="This month" value={Math.round(data.tips.monthDrop)} sub={`${data.tips.monthCount} tips`} />
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Ops</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Open support" value={data.support.openTickets} />
          <Stat label="Unread support" value={data.support.unreadTickets} />
          <Stat label="Radio stations" value={data.stations.total} />
          <Stat label="Pending withdrawals" value={data.treasury.pendingWithdrawals} />
        </div>
      </div>
    </div>
  );
}
