"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Coins, Music, Flag, Ban } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { useOnChainDrop } from "@/hooks/useOnChainDrop";
import { useStreamChat } from "@/hooks/useStreamChat";
import { TRACK_UNLOCK_COST, REQUEST_COST, HIGHLIGHT_TIP_MIN } from "@/lib/constants";
import { AchievementToasts, useAchievementUnlocks } from "@/components/AchievementToasts";
import { StakerBadge, tierFromBadgeLabel } from "@/components/StakerBadge";
import { ProfileAvatar } from "@/components/ProfileAvatar";

interface StreamChatProps {
  streamId: string;
  djName: string;
  djUsername: string;
  djWalletAddress?: string | null;
  nowPlaying?: { title: string; artist: string } | null;
  startedAt?: string | null;
  isHost?: boolean;
}

export function StreamChat({
  streamId,
  djName,
  djUsername,
  djWalletAddress,
  nowPlaying,
  startedAt,
  isHost = false,
}: StreamChatProps) {
  const { user, refresh } = useAuth();
  const { isConnected, contractsReady, isPending, approveTipRouter, tipOnChain, balanceWei } =
    useOnChainDrop();
  const { messages, status, appendMessage } = useStreamChat(streamId);
  const [input, setInput] = useState("");
  const [tipAmount, setTipAmount] = useState("");
  const [showTip, setShowTip] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [requestTrack, setRequestTrack] = useState("");
  const [requestSent, setRequestSent] = useState("");
  const [error, setError] = useState("");
  const [tipOnChainMode, setTipOnChainMode] = useState(false);
  const [requestCost, setRequestCost] = useState(REQUEST_COST);
  const [trackUnlockCost, setTrackUnlockCost] = useState(TRACK_UNLOCK_COST);
  const [isVip, setIsVip] = useState(false);
  const [isStaker, setIsStaker] = useState(false);
  const [stakerTier, setStakerTier] = useState<string | null>(null);
  const [tipAtDrop, setTipAtDrop] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const { queue, pushUnlocks, dismissOne } = useAchievementUnlocks();
  const [unlockedTrack, setUnlockedTrack] = useState<string | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const messagesRef = useRef<HTMLDivElement>(null);

  const canUseOnChain =
    contractsReady && isConnected && Boolean(djWalletAddress?.startsWith("0x"));
  const onChainDropBal =
    balanceWei !== undefined ? Number(balanceWei / BigInt(10 ** 18)) : null;
  const djWalletReady = djWalletAddress?.startsWith("0x");
  const fanWalletReady = contractsReady && isConnected;

  useEffect(() => {
    if (canUseOnChain && showTip && !tipOnChainMode) {
      setTipOnChainMode(true);
    }
  }, [canUseOnChain, showTip, tipOnChainMode]);

  function openTipForm() {
    setShowRequest(false);
    setShowTip(true);
    if (!tipAmount) setTipAmount("25");
  }

  async function reportMessage(messageId: string) {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    const res = await apiFetch(`/api/chat/report/${messageId}`, {
      method: "POST",
      body: JSON.stringify({ reason: "spam" }),
    });
    if (res.ok) {
      setReportedIds((prev) => new Set(prev).add(messageId));
    }
  }

  async function banChatter(userId: string) {
    if (!isHost || !userId) return;
    if (!confirm("Ban this user from chat for the rest of this stream?")) return;
    const res = await apiFetch(`/api/chat/${streamId}/ban`, {
      method: "POST",
      body: JSON.stringify({ userId, reason: "host ban" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Ban failed");
    }
  }

  useEffect(() => {
    if (!user) return;
    apiFetch(`/api/stream-pricing?streamId=${encodeURIComponent(streamId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setRequestCost(d.requestCost);
          setTrackUnlockCost(d.trackUnlockCost);
          setIsVip(Boolean(d.vip));
          setIsStaker(Boolean(d.staker));
          setStakerTier(d.stakerTier ?? null);
        }
      });
  }, [user, streamId]);

  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsedMs(Date.now() - start);
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  useEffect(() => {
    if (!user) return;
    function pollQueue() {
      apiFetch(`/api/requests?streamId=${streamId}&myPosition=1`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) setQueuePosition(d.position);
        });
    }
    pollQueue();
    const interval = setInterval(pollQueue, 5000);
    return () => clearInterval(interval);
  }, [user, streamId]);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !user) return;
    setError("");
    const res = await apiFetch(`/api/chat/${streamId}`, {
      method: "POST",
      body: JSON.stringify({ message: input.trim() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Could not send message");
      return;
    }
    const data = await res.json();
    if (data.message) appendMessage(data.message);
    setInput("");
  }

  async function handleTip(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const amount = parseInt(tipAmount, 10);
    if (!amount || amount <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (!user) {
      setError("Login to tip");
      return;
    }

    const canOnChain = tipOnChainMode && canUseOnChain;

    if (canOnChain) {
      try {
        await approveTipRouter(amount);
        const txHash = await tipOnChain(djWalletAddress as `0x${string}`, amount, streamId);
        const syncRes = await apiFetch("/api/tips/on-chain", {
          method: "POST",
          body: JSON.stringify({
            streamId,
            amount,
            txHash,
            message: `tipped ${amount} DROP on-chain`,
          }),
        });
        if (!syncRes.ok) {
          const d = await syncRes.json();
          throw new Error(d.error ?? "Tip sync failed");
        }
        setTipAmount("");
        setShowTip(false);
        setTipOnChainMode(false);
        await refresh();
        return;
      } catch (err) {
        setError(
          err instanceof Error
            ? `${err.message} — try unchecking "On-chain" to tip from app balance`
            : "On-chain tip failed",
        );
        return;
      }
    }

    const res = await apiFetch("/api/tips", {
      method: "POST",
      body: JSON.stringify({
        streamId,
        amount,
        message: tipAtDrop && amount >= HIGHLIGHT_TIP_MIN ? "Tip this drop 🔥" : `tipped ${amount} DROP 💎`,
        timestampMs: tipAtDrop && amount >= HIGHLIGHT_TIP_MIN ? elapsedMs : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Tip failed");
      return;
    }
    if (data.unlockedAchievements?.length) pushUnlocks(data.unlockedAchievements);
    await refresh();
    setTipAmount("");
    setShowTip(false);
    setTipAtDrop(false);
  }

  async function handleUnlockTrack() {
    if (!user) {
      setError("Login to unlock");
      return;
    }
    const res = await apiFetch("/api/track-unlock", {
      method: "POST",
      body: JSON.stringify({ streamId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Unlock failed");
      return;
    }
    setUnlockedTrack(`${data.track.title} — ${data.track.artist}`);
    await refresh();
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setError("Login to request");
      return;
    }
    if (!requestTrack.trim()) return;
    const res = await apiFetch("/api/requests", {
      method: "POST",
      body: JSON.stringify({ streamId, trackTitle: requestTrack.trim(), amount: requestCost }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Request failed");
      return;
    }
    await refresh();
    setRequestTrack("");
    setShowRequest(false);
    setError("");
    setRequestSent(`Request sent! ${requestCost} DROP held until the DJ responds.`);
    setTimeout(() => setRequestSent(""), 5000);
  }

  const hasTrack = Boolean(nowPlaying?.title && nowPlaying?.artist);

  return (
    <div className="flex h-full flex-col bg-[#0a0a0c] min-w-0 overflow-hidden">
      <AchievementToasts unlocks={queue} onDismiss={dismissOne} />
      <div className="border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Stream Chat</h3>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === "live"
                  ? "bg-[#53fc18] live-pulse"
                  : status === "connecting" || status === "reconnecting"
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-zinc-600"
              }`}
            />
            {status === "live"
              ? "Real-time"
              : status === "reconnecting"
                ? "Reconnecting…"
                : status === "connecting"
                  ? "Connecting…"
                  : "Offline"}
            {isVip && (
              <span className="ml-1 text-purple-400 normal-case">· Member perks active</span>
            )}
            {isStaker && (
              <span className="ml-1 text-cyan-400 normal-case">
                · Member perks (cheaper unlocks{stakerTier ? ` · ${stakerTier}` : ""})
              </span>
            )}
          </p>
        </div>
      </div>

      {queuePosition != null && (
        <div className="mx-3 mt-2 rounded-lg bg-purple-500/10 border border-purple-500/20 px-3 py-2 text-xs text-purple-200">
          Your request is #{queuePosition} in queue{isVip ? " (member priority)" : ""}
        </div>
      )}
      {requestSent && (
        <div className="mx-3 mt-2 rounded-lg bg-purple-500/10 border border-purple-500/20 px-3 py-2 text-xs text-purple-200">
          {requestSent}
        </div>
      )}

      {unlockedTrack && (
        <div className="mx-3 mt-2 rounded-lg bg-[#53fc18]/10 border border-[#53fc18]/20 px-3 py-2 text-xs text-[#53fc18]">
          Unlocked: {unlockedTrack}
        </div>
      )}

      {isHost && (
        <div className="mx-3 mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-[11px] text-amber-200/90">
          Host mod: ban button appears beside fan messages (not tips). Scroll up if you only see the tip bar.
        </div>
      )}

      <div
        ref={messagesRef}
        className="flex-1 overflow-y-auto overscroll-y-contain p-3 sm:p-4 space-y-3 min-h-0"
      >
        {messages.map((msg) => (
          <div key={msg.id} className="text-sm group flex gap-2.5">
            <ProfileAvatar
              displayName={msg.displayName ?? msg.username}
              avatar={msg.avatar ?? msg.username.slice(0, 2).toUpperCase()}
              avatarUrl={msg.avatarUrl}
              size="xs"
              className="mt-0.5 shrink-0"
            />
            <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <span
                className={`font-semibold ${
                  msg.isTip ? "text-[#53fc18]" : "text-purple-400"
                }`}
              >
                {msg.displayName ?? msg.username}
                {msg.stakerBadge && (
                  <StakerBadge label={msg.stakerBadge} tier={tierFromBadgeLabel(msg.stakerBadge)} />
                )}
                {isVip && user?.username === msg.username && (
                  <span className="ml-1 text-purple-300" title="Legacy member">⭐</span>
                )}
              </span>
              <div
                className={`flex items-center gap-1.5 shrink-0 ${
                  isHost ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                } transition-opacity`}
              >
                {isHost && msg.userId && msg.username !== djUsername && !msg.isTip ? (
                  <button
                    type="button"
                    onClick={() => banChatter(msg.userId!)}
                    title="Ban from chat"
                    className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold text-red-400/90 bg-red-500/10 hover:bg-red-500/20"
                  >
                    <Ban className="h-3 w-3" />
                    Ban
                  </button>
                ) : null}
                {user && msg.userId && msg.userId !== user.id && !msg.isTip ? (
                  reportedIds.has(msg.id) ? (
                    <span className="text-[10px] text-zinc-600">Reported</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => reportMessage(msg.id)}
                      title="Report message"
                      className="p-0.5 text-zinc-600 hover:text-amber-400"
                    >
                      <Flag className="h-3 w-3" />
                    </button>
                  )
                ) : null}
              </div>
            </div>
            <p className={`mt-0.5 ${msg.isTip ? "text-[#53fc18]/90" : "text-zinc-300"}`}>
              {msg.message}
            </p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/5 p-2 sm:p-3 space-y-2 shrink-0 min-w-0 max-h-[min(34vh,260px)] overflow-y-auto overscroll-y-contain bg-[#0a0a0c]">
        <div className="flex gap-1.5 sm:gap-2 min-w-0">
          <button
            onClick={handleUnlockTrack}
            disabled={!hasTrack}
            title={hasTrack ? `Unlock for ${trackUnlockCost} DROP` : "DJ hasn't set a track yet"}
            className="flex-1 min-w-0 flex items-center justify-center gap-1 rounded-xl bg-white/[0.04] border border-white/[0.06] py-2 px-1 text-[10px] sm:text-[11px] font-medium text-zinc-400 hover:border-[#53fc18]/30 hover:text-[#53fc18] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Music className="h-3 w-3 shrink-0" />
            <span className="truncate">ID · {trackUnlockCost}</span>
          </button>
          <button
            onClick={() => setShowRequest(true)}
            className="flex-1 min-w-0 rounded-xl bg-white/[0.04] border border-white/[0.06] py-2 px-1 text-[10px] sm:text-[11px] font-medium text-zinc-400 hover:border-[#53fc18]/30 transition-colors truncate"
          >
            Req · {requestCost}
          </button>
          <button
            onClick={openTipForm}
            className="flex-1 min-w-0 rounded-xl bg-[#53fc18]/10 border border-[#53fc18]/20 py-2 px-1 text-[10px] sm:text-[11px] font-bold text-[#53fc18] hover:bg-[#53fc18]/20 transition-colors"
          >
            Tip
          </button>
        </div>

        {showRequest ? (
          <form onSubmit={handleRequest} className="space-y-2">
            <input
              value={requestTrack}
              onChange={(e) => setRequestTrack(e.target.value)}
              placeholder="Artist - Title"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 rounded-lg bg-[#53fc18] py-2 text-sm font-bold text-black">
                Send · {requestCost} DROP
              </button>
              <button type="button" onClick={() => setShowRequest(false)} className="text-xs text-zinc-500 px-2">
                Cancel
              </button>
            </div>
          </form>
        ) : showTip ? (
          <form onSubmit={handleTip} className="space-y-2">
            <div className="flex gap-2">
              {[10, 25, 50, 100].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTipAmount(String(amt))}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold ${
                    tipAmount === String(amt)
                      ? "bg-[#53fc18] text-black"
                      : "bg-white/5 text-zinc-400"
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                placeholder="DROP amount"
                className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
              />
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#53fc18] to-[#00d4aa] px-4 py-2 text-sm font-bold text-black disabled:opacity-50 shrink-0"
              >
                <Coins className="h-4 w-4" />
                Send tip
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">
              {tipOnChainMode && canUseOnChain
                ? `On-chain via LiveBooth wallet${onChainDropBal != null ? ` · ${onChainDropBal} DROP on-chain` : ""}`
                : `In-app balance · you have ${user?.balance ?? "—"} DROP`}
            </p>
            {canUseOnChain && (
              <label className="flex items-center gap-2 text-[11px] text-purple-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tipOnChainMode}
                  onChange={(e) => setTipOnChainMode(e.target.checked)}
                  className="rounded"
                />
                Tip on-chain via your LiveBooth wallet (VeChain testnet)
              </label>
            )}
            {contractsReady && showTip && (!fanWalletReady || !djWalletReady) && (
              <p className="text-[10px] text-purple-300/80 leading-relaxed">
                {!fanWalletReady && (
                  <>
                    Enable your on-chain wallet on{" "}
                    <a href="/wallet" className="underline">
                      /wallet
                    </a>{" "}
                    first, then return here.
                  </>
                )}
                {!fanWalletReady && !djWalletReady && " "}
                {!djWalletReady && (
                  <>
                    DJ must enable an on-chain wallet on{" "}
                    <a href="/wallet" className="underline">
                      /wallet
                    </a>{" "}
                    before on-chain tips appear.
                  </>
                )}
              </p>
            )}
            {parseInt(tipAmount, 10) >= HIGHLIGHT_TIP_MIN && (
              <label className="flex items-center gap-2 text-[11px] text-amber-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tipAtDrop}
                  onChange={(e) => setTipAtDrop(e.target.checked)}
                  className="rounded"
                />
                Tip this drop — pin moment on VOD ({HIGHLIGHT_TIP_MIN}+ DROP)
              </label>
            )}
            <button type="button" onClick={() => setShowTip(false)} className="text-xs text-zinc-500">
              Cancel
            </button>
          </form>
        ) : (
          <div className="flex gap-2">
            <form onSubmit={handleSend} className="flex flex-1 gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={user ? "Send a message..." : "Login to chat"}
                disabled={!user}
                className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white disabled:opacity-50"
              />
              <button type="submit" className="rounded-lg bg-white/10 px-3 py-2">
                <Send className="h-4 w-4" />
              </button>
            </form>
            <button
              onClick={openTipForm}
              className="flex items-center gap-1 rounded-lg border border-[#53fc18]/30 bg-[#53fc18]/10 px-3 py-2 text-sm font-semibold text-[#53fc18]"
            >
              <Coins className="h-4 w-4" />
            </button>
          </div>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}
