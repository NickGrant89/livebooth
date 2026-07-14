"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { SUPPORT_CATEGORIES } from "@/lib/constants";
import type { SupportMessagePayload } from "@/lib/support-chat-types";

const STORAGE_KEY = "lb_support_chat";
const POLL_MS = 3000;

type StoredSession = {
  ticketId: string;
  channelToken: string;
};

function loadStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (parsed.ticketId && parsed.channelToken) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function saveSession(session: StoredSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

function mergeMessages(prev: SupportMessagePayload[], incoming: SupportMessagePayload[]) {
  if (incoming.length === 0) return prev;
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function SupportLiveChat({
  compact = false,
  panelOpen = true,
  onAdminReplyWhileClosed,
}: {
  compact?: boolean;
  panelOpen?: boolean;
  onAdminReplyWhileClosed?: (preview: string) => void;
}) {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [category, setCategory] = useState("other");
  const [draft, setDraft] = useState("");
  const [session, setSession] = useState<StoredSession | null>(null);
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState<string>("open");
  const [messages, setMessages] = useState<SupportMessagePayload[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAtRef = useRef<string | null>(null);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  const poll = useCallback(async (active: StoredSession) => {
    const since = lastAtRef.current;
    const url = since
      ? `/api/support/chat/${active.ticketId}?since=${encodeURIComponent(since)}`
      : `/api/support/chat/${active.ticketId}`;

    try {
      const res = await apiFetch(url, {
        headers: { "X-Support-Token": active.channelToken },
      });
      if (!res.ok) {
        if (res.status === 404) clearSession();
        return;
      }
      const data = (await res.json()) as {
        ticket: { status: string; subject: string };
        messages: SupportMessagePayload[];
      };
      setStatus(data.ticket.status);
      setSubject(data.ticket.subject);
      if (data.messages.length) {
        setMessages((prev) => {
          const merged = since ? mergeMessages(prev, data.messages) : data.messages;
          if (merged.length) lastAtRef.current = merged[merged.length - 1]!.createdAt;
          if (!panelOpen && onAdminReplyWhileClosed) {
            for (const m of data.messages) {
              if (m.senderRole === "admin") onAdminReplyWhileClosed(m.body);
            }
          }
          return merged;
        });
      } else if (!since && data.messages) {
        setMessages([]);
      }
    } catch {
      /* polling best-effort */
    }
  }, [panelOpen, onAdminReplyWhileClosed]);

  useEffect(() => {
    const stored = loadStoredSession();
    if (stored) {
      setSession(stored);
      void poll(stored);
    }
  }, [poll]);

  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => void poll(session), POLL_MS);
    return () => clearInterval(id);
  }, [session, poll]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  async function startChat(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setStarting(true);
    setError("");
    const res = await apiFetch("/api/support/chat/session", {
      method: "POST",
      body: JSON.stringify({ email, category, message: draft.trim() }),
    });
    const data = await res.json();
    setStarting(false);
    if (!res.ok) {
      setError(data.error ?? "Could not start chat");
      return;
    }
    const active = { ticketId: data.ticketId, channelToken: data.channelToken };
    saveSession(active);
    setSession(active);
    setSubject(data.subject);
    setStatus(data.status);
    setMessages(data.messages ?? []);
    if (data.messages?.length) {
      lastAtRef.current = data.messages[data.messages.length - 1].createdAt;
    }
    setDraft("");
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !input.trim() || status === "resolved") return;
    setLoading(true);
    setError("");
    const res = await apiFetch(`/api/support/chat/${session.ticketId}`, {
      method: "POST",
      headers: { "X-Support-Token": session.channelToken },
      body: JSON.stringify({ body: input.trim(), channelToken: session.channelToken }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not send");
      return;
    }
    setMessages((prev) => {
      const merged = mergeMessages(prev, [data.message]);
      lastAtRef.current = data.message.createdAt;
      return merged;
    });
    setInput("");
  }

  function newChat() {
    clearSession();
    setSession(null);
    setMessages([]);
    setSubject("");
    setStatus("open");
    lastAtRef.current = null;
  }

  if (!session) {
    return (
      <form
        onSubmit={startChat}
        className={`${compact ? "space-y-3" : "space-y-4"} ${compact ? "" : "rounded-2xl border border-[#53fc18]/30 bg-[#141416] p-6"}`}
      >
        {!compact && (
          <div>
            <h2 className="font-bold text-white flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-[#53fc18]" />
              Live support chat
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Chat with our team — your conversation is saved as a support ticket so nothing gets lost.
            </p>
          </div>
        )}
        {compact && (
          <p className="text-xs text-zinc-500">
            Chat with our team — saved as a support ticket.
          </p>
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Your email"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
        >
          {SUPPORT_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          required
          rows={compact ? 2 : 3}
          placeholder="Describe your issue — we'll reply here and by email…"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm resize-none"
        />
        <button
          type="submit"
          disabled={starting}
          className="rounded-xl bg-[#53fc18] px-5 py-2.5 text-sm font-bold text-black disabled:opacity-50 flex items-center gap-2"
        >
          {starting && <Loader2 className="h-4 w-4 animate-spin" />}
          Start chat
        </button>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </form>
    );
  }

  return (
    <div
      className={`${compact ? "border border-white/10 rounded-xl" : "rounded-2xl border border-[#53fc18]/30 bg-[#141416]"} overflow-hidden flex flex-col ${compact ? "h-[340px]" : "h-[420px]"}`}
    >
      <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-white text-sm truncate">{subject || "Support chat"}</p>
          <p className="text-[11px] text-zinc-500">
            Ticket logged ·{" "}
            <span className={status === "resolved" ? "text-zinc-500" : "text-[#53fc18]"}>
              {status.replace(/_/g, " ")}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={newChat}
          className="text-[11px] text-zinc-500 hover:text-white shrink-0"
        >
          New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              m.senderRole === "admin"
                ? "bg-[#53fc18]/15 border border-[#53fc18]/25 text-zinc-100 ml-0 mr-auto"
                : "bg-white/5 border border-white/10 text-zinc-200 ml-auto mr-0"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-0.5">
              {m.senderRole === "admin" ? "LiveBooth support" : "You"}
            </p>
            <p className="whitespace-pre-wrap break-words">{m.body}</p>
            <p className="text-[10px] text-zinc-600 mt-1">
              {new Date(m.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {status === "resolved" ? (
        <div className="border-t border-white/10 p-4 text-sm text-zinc-500">
          This ticket is closed.{" "}
          <button type="button" onClick={newChat} className="text-[#53fc18] hover:underline">
            Start a new chat
          </button>
        </div>
      ) : (
        <form onSubmit={sendMessage} className="border-t border-white/10 p-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-[#53fc18] px-3 py-2 text-black disabled:opacity-50"
            aria-label="Send"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      )}
      {error && <p className="px-4 pb-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
