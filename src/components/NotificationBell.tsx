"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { WebPushToggle } from "@/components/WebPushToggle";

interface Notif {
  id: string;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notif[]>([]);

  useEffect(() => {
    if (!user) return;
    function load() {
      apiFetch("/api/notifications")
        .then((r) => r.json())
        .then((d) => {
          setUnreadCount(d.unreadCount ?? 0);
          setNotifications(d.notifications ?? []);
        });
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  async function markRead() {
    await apiFetch("/api/notifications", { method: "PATCH", body: "{}" });
    setUnreadCount(0);
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open && unreadCount > 0) markRead();
        }}
        className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#53fc18]" />
        )}
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-label="Close" />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 max-h-96 overflow-y-auto rounded-xl border border-white/10 bg-[#141416] shadow-xl">
            <p className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase border-b border-white/5">
              Notifications
            </p>
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">No notifications yet</p>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.href ?? "#"}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 border-b border-white/5 hover:bg-white/5 ${!n.read ? "bg-[#53fc18]/5" : ""}`}
                >
                  <p className="text-sm font-medium text-white">{n.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{n.body}</p>
                </Link>
              ))
            )}
            <WebPushToggle compact />
          </div>
        </>
      )}
    </div>
  );
}
