"use client";

import { useState } from "react";
import { MessageSquare, Tv } from "lucide-react";

type MobileTab = "watch" | "chat";

export function StreamMobileTabs({
  watch,
  chat,
}: {
  watch: React.ReactNode;
  chat: React.ReactNode;
}) {
  const [tab, setTab] = useState<MobileTab>("watch");

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full">
      {/* Mobile: tab switcher */}
      <div className="lg:hidden flex border-b border-white/[0.06] bg-[#0a0a0c] shrink-0">
        <button
          type="button"
          onClick={() => setTab("watch")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold ${
            tab === "watch"
              ? "text-white border-b-2 border-[#53fc18]"
              : "text-zinc-500"
          }`}
        >
          <Tv className="h-4 w-4" />
          Watch
        </button>
        <button
          type="button"
          onClick={() => setTab("chat")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold ${
            tab === "chat"
              ? "text-white border-b-2 border-[#53fc18]"
              : "text-zinc-500"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Chat
        </button>
      </div>

      {/* Mobile: single panel */}
      <div className="lg:hidden flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
        {tab === "watch" ? watch : chat}
      </div>

      {/* Desktop: side by side */}
      <div className="hidden lg:flex flex-1 flex-row min-h-0 min-w-0 overflow-hidden max-w-[1600px] mx-auto w-full">
        <div className="flex-1 min-w-0 flex flex-col">{watch}</div>
        <div className="shrink-0 flex flex-col border-l border-white/[0.06]">{chat}</div>
      </div>
    </div>
  );
}
