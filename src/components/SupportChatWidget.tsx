"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { SupportLiveChat } from "@/components/SupportLiveChat";

const HIDDEN_PREFIXES = ["/embed", "/support", "/admin"];

export function SupportChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))) {
    return null;
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
            <SupportLiveChat compact />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#53fc18] text-black shadow-lg shadow-[#53fc18]/25 hover:scale-105 active:scale-95 transition-transform"
        aria-label={open ? "Close support chat" : "Open support chat"}
        aria-expanded={open}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
