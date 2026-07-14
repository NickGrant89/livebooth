"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, UserRound } from "lucide-react";

import { inviteRoleLabel } from "@/lib/invite-copy";

type Message = {
  id: string;
  senderRole: string;
  body: string;
  createdAt: string;
};

type AdminOption = {
  id: string;
  username: string;
  displayName: string;
};

type TicketUser = {
  username?: string;
  displayName?: string;
  role?: string;
  email?: string;
};

type Props = {
  ticket: Record<string, unknown>;
  messages: Message[];
  admins?: AdminOption[];
  unread?: boolean;
  onOpen?: () => void;
  onStatusChange: (status: string) => void;
  onAssign?: (assignedAdminId: string | null) => void;
  onReply: (body: string) => Promise<void>;
};

export function SupportTicketAdminCard({
  ticket,
  messages,
  admins = [],
  unread,
  onOpen,
  onStatusChange,
  onAssign,
  onReply,
}: Props) {
  const [open, setOpen] = useState(String(ticket.status) !== "resolved");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const markedRead = useRef(false);

  const assignedAdmin = ticket.assignedAdmin as AdminOption | null | undefined;
  const assignedAdminId = ticket.assignedAdminId ? String(ticket.assignedAdminId) : "";
  const ticketUser = ticket.user as TicketUser | null | undefined;
  const contactName = ticketUser?.displayName?.trim() || "Guest";
  const contactUsername = ticketUser?.username?.trim();
  const contactEmail = String(ticket.email || ticketUser?.email || "").trim() || "No email";
  const contactRole = ticketUser?.role ? inviteRoleLabel(ticketUser.role) : null;

  useEffect(() => {
    if (unread && open && onOpen && !markedRead.current) {
      markedRead.current = true;
      onOpen();
    }
  }, [unread, open, onOpen]);

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    await onReply(reply.trim());
    setReply("");
    setSending(false);
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${unread ? "border-[#53fc18]/40 bg-[#141416]" : "border-white/10 bg-[#141416]"}`}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (next && unread && onOpen) onOpen();
            return next;
          });
        }}
        className="w-full flex items-start justify-between gap-2 p-4 text-left hover:bg-white/[0.02]"
      >
        <div className="min-w-0">
          <p className="font-semibold text-white text-sm truncate flex items-center gap-2">
            {unread && <span className="h-2 w-2 rounded-full bg-[#53fc18] shrink-0" aria-label="Unread" />}
            {String(ticket.subject)}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5 truncate">
            <span className="text-zinc-200 font-medium">{contactName}</span>
            {contactUsername ? (
              <span className="text-zinc-500"> @{contactUsername}</span>
            ) : null}
            {contactRole ? <span className="text-zinc-600"> · {contactRole}</span> : null}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">
            {contactEmail !== "No email" ? (
              <a href={`mailto:${contactEmail}`} className="hover:text-[#53fc18] hover:underline" onClick={(e) => e.stopPropagation()}>
                {contactEmail}
              </a>
            ) : (
              contactEmail
            )}
            {" · "}
            {String(ticket.category)}
            {" · "}
            {messages.length} msg{messages.length !== 1 ? "s" : ""}
            {assignedAdmin ? (
              <span className="text-zinc-400">
                {" "}
                · <UserRound className="inline h-3 w-3 -mt-0.5" /> {assignedAdmin.displayName}
              </span>
            ) : (
              <span className="text-amber-500/80"> · Unassigned</span>
            )}
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
          {onAssign && admins.length > 0 && (
            <div className="pt-3 flex flex-wrap items-center gap-2">
              <label htmlFor={`assign-${String(ticket.id)}`} className="text-[10px] uppercase text-zinc-500 font-semibold">
                Assign to
              </label>
              <select
                id={`assign-${String(ticket.id)}`}
                value={assignedAdminId}
                onChange={(e) => onAssign(e.target.value || null)}
                className="rounded-lg bg-white/5 border border-white/10 text-xs px-2 py-1.5 min-w-[160px]"
              >
                <option value="">Unassigned</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.displayName} (@{a.username})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="pt-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-zinc-400 space-y-0.5">
            <p>
              <span className="text-zinc-500 uppercase text-[10px] font-semibold tracking-wide">Contact</span>
            </p>
            <p className="text-zinc-200">
              {contactName}
              {contactUsername ? <span className="text-zinc-500"> @{contactUsername}</span> : null}
              {contactRole ? <span className="text-zinc-600"> · {contactRole}</span> : null}
            </p>
            {contactEmail !== "No email" && (
              <p>
                <a href={`mailto:${contactEmail}`} className="text-[#53fc18] hover:underline">
                  {contactEmail}
                </a>
              </p>
            )}
          </div>
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
                    {m.senderRole === "admin" ? "Support" : contactName}
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
