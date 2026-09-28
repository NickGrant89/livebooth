"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Maximize2, Minimize2, Tv } from "lucide-react";
import { useStreamChatContext } from "@/context/StreamChatContext";

type MobileTab = "watch" | "chat";

function useIsLgViewport() {
  const [isLg, setIsLg] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsLg(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isLg;
}

export function StreamMobileTabs({
  watch,
  chat,
}: {
  watch: React.ReactNode;
  chat: React.ReactNode;
}) {
  const [tab, setTab] = useState<MobileTab>("watch");
  const [theatre, setTheatre] = useState(false);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const isLg = useIsLgViewport();
  const { messages } = useStreamChatContext();

  useEffect(() => {
    if (tab === "chat") {
      setLastSeenCount(messages.length);
    }
  }, [tab, messages.length]);

  const unread = tab === "watch" ? Math.max(0, messages.length - lastSeenCount) : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full">
      <div className="lg:hidden flex border-b border-white/[0.06] bg-[#0a0a0c] shrink-0 items-stretch">
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
          className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold ${
            tab === "chat"
              ? "text-white border-b-2 border-[#53fc18]"
              : "text-zinc-500"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Chat
          {unread > 0 && (
            <span className="absolute top-1.5 right-[calc(50%-2.5rem)] min-w-[1.125rem] h-[1.125rem] rounded-full bg-[#53fc18] text-[10px] font-bold text-black px-1 flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
        {tab === "watch" && (
          <button
            type="button"
            onClick={() => setTheatre((t) => !t)}
            className="px-3 border-l border-white/[0.06] text-zinc-400 hover:text-white"
            aria-label={theatre ? "Exit theatre mode" : "Theatre mode"}
            title={theatre ? "Show set info" : "Theatre mode — full screen video"}
          >
            {theatre ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        )}
      </div>

      {isLg ? (
        <div className="flex flex-1 flex-row min-h-0 min-w-0 h-full overflow-hidden max-w-[1600px] mx-auto w-full">
          <div className="flex-1 min-w-0 min-h-0 h-full flex flex-col overflow-hidden">{watch}</div>
          <div className="shrink-0 flex flex-col min-h-0 h-full self-stretch overflow-hidden border-l border-white/[0.06]">
            {chat}
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden relative">
          <div
            className={`flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden ${
              tab === "watch" ? "" : "hidden"
            } ${theatre ? "mobile-theatre-watch" : ""}`}
          >
            {watch}
          </div>
          <div
            className={`flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden ${
              tab === "chat" ? "" : "hidden"
            }`}
          >
            {chat}
          </div>
        </div>
      )}
    </div>
  );
}
