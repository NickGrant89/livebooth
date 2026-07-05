"use client";

import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { SupportLiveChat } from "@/components/SupportLiveChat";

const HIDDEN_PREFIXES = ["/embed", "/support", "/admin"];

function showBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body: body.slice(0, 120), tag: "livebooth-support" });
  } catch {
    /* ignore */
  }
}

export function SupportChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const handleAdminReplyWhileClosed = useCallback((preview: string) => {
    setUnread((n) => n + 1);
    showBrowserNotification("Support replied", preview);
  }, []);

  if (HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))) {
    return null;
  }

  function toggleOpen() {
    setOpen((v) => {
      if (!v) setUnread(0);
      return !v;
    });
  }

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 pointer-events-none">
      <div
        className={`pointer-events-auto w-[min(calc(100vw-2rem),380px)] transition-all duration-200 origin-bottom-right ${
          open
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-95 opacity-0 translate-y-2 pointer-events-none h-0 overflow-hidden"
        }`}
        aria-hidden={!open}
      >
        <div className="rounded-2xl border border-white/10 bg-[#0c0c0e] shadow-2xl shadow-black/50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-[#141416]">
            <p className="text-sm font-semibold text-white">Live support</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
              aria-label="Close support chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-3">
            <SupportLiveChat
              compact
              panelOpen={open}
              onAdminReplyWhileClosed={handleAdminReplyWhileClosed}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={toggleOpen}
        className="pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full bg-[#53fc18] text-black shadow-lg shadow-[#53fc18]/25 hover:scale-105 active:scale-95 transition-transform"
        aria-label={open ? "Close support chat" : "Open support chat"}
        aria-expanded={open}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </div>
  );
}
