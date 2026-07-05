"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";

type Message = {
  id: string;
  senderRole: string;
  body: string;
  createdAt: string;
};

type Props = {
  ticket: Record<string, unknown>;
  messages: Message[];
  onStatusChange: (status: string) => void;
  onReply: (body: string) => Promise<void>;
};

export function SupportTicketAdminCard({ ticket, messages, onStatusChange, onReply }: Props) {
  const [open, setOpen] = useState(String(ticket.status) !== "resolved");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    await onReply(reply.trim());
    setReply("");
    setSending(false);
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#141416] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start justify-between gap-2 p-4 text-left hover:bg-white/[0.02]"
      >
        <div className="min-w-0">
          <p className="font-semibold text-white text-sm truncate">{String(ticket.subject)}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {String(ticket.email)} · {String(ticket.category)} · {messages.length} msg
            {messages.length !== 1 ? "s" : ""}
          </p>
        </div>
        <select
          value={String(ticket.status)}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onStatusChange(e.target.value)}
          className="rounded bg-white/5 border border-white/10 text-xs px-2 py-0.5 shrink-0"
        >
          <option value="open">open</option>
          <option value="in_progress">in progress</option>
          <option value="resolved">resolved</option>
        </select>
      </button>

      {open && (
        <div className="border-t border-white/10 px-4 pb-4">
          <div className="max-h-64 overflow-y-auto space-y-2 py-3">
            {messages.length === 0 ? (
              <p className="text-xs text-zinc-500">{String(ticket.body)}</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg px-3 py-2 text-xs ${
                    m.senderRole === "admin"
                      ? "bg-[#53fc18]/10 border border-[#53fc18]/20 ml-4"
                      : "bg-white/5 border border-white/10 mr-4"
                  }`}
                >
                  <p className="text-[10px] uppercase text-zinc-500 mb-0.5">
                    {m.senderRole === "admin" ? "Support" : "User"}
                  </p>
                  <p className="text-zinc-300 whitespace-pre-wrap">{m.body}</p>
                  <p className="text-[10px] text-zinc-600 mt-1">
                    {new Date(m.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
          {String(ticket.status) !== "resolved" && (
            <form onSubmit={submitReply} className="flex gap-2">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Reply in live chat…"
                className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs"
              />
              <button
                type="submit"
                disabled={sending || !reply.trim()}
                className="rounded-lg bg-[#53fc18] px-3 py-2 text-black disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
