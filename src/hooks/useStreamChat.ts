"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessagePayload } from "@/lib/chat-hub";

export type ChatConnectionStatus = "connecting" | "live" | "reconnecting" | "offline";

/** Incremental backfill — SSE live fan-out is unreliable on multi-instance serverless. */
const POLL_MS = 2500;

function mergeChatMessages(
  prev: ChatMessagePayload[],
  incoming: ChatMessagePayload[],
): ChatMessagePayload[] {
  if (incoming.length === 0) return prev;
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const msg of incoming) {
    byId.set(msg.id, msg);
  }
  return [...byId.values()]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-100);
}

export function useStreamChat(streamId: string) {
  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
  const [status, setStatus] = useState<ChatConnectionStatus>("connecting");
  const sourceRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const pollMessagesRef = useRef<() => void>(() => {});

  const mergeMessages = useCallback((incoming: ChatMessagePayload[]) => {
    setMessages((prev) => {
      const merged = mergeChatMessages(prev, incoming);
      if (merged.length > 0) {
        lastMessageIdRef.current = merged[merged.length - 1]!.id;
      }
      return merged;
    });
  }, []);

  const appendMessage = useCallback(
    (msg: ChatMessagePayload) => {
      mergeMessages([msg]);
    },
    [mergeMessages],
  );

  const pollMessages = useCallback(async () => {
    const afterId = lastMessageIdRef.current;
    const url = afterId
      ? `/api/chat/${streamId}?afterId=${encodeURIComponent(afterId)}`
      : `/api/chat/${streamId}`;

    try {
      const res = await fetch(url, {
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { messages?: ChatMessagePayload[] };
      if (data.messages?.length) {
        mergeMessages(data.messages);
      }
      setStatus("live");
    } catch {
      /* polling is best-effort */
    }
  }, [streamId, mergeMessages]);

  pollMessagesRef.current = () => {
    void pollMessages();
  };

  const connect = useCallback(() => {
    sourceRef.current?.close();
    if (retryRef.current) clearTimeout(retryRef.current);

    setStatus((s) => (s === "live" ? "reconnecting" : "connecting"));

    const source = new EventSource(`/api/chat/${streamId}/stream`);
    sourceRef.current = source;

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as
          | { type: "history"; messages: ChatMessagePayload[] }
          | { type: "message"; message: ChatMessagePayload };

        if (payload.type === "history") {
          mergeMessages(payload.messages);
          setStatus("live");
        } else if (payload.type === "message") {
          appendMessage(payload.message);
          setStatus("live");
        }
      } catch {
        /* ignore malformed */
      }
    };

    source.onerror = () => {
      source.close();
      sourceRef.current = null;
      setStatus("reconnecting");
      retryRef.current = setTimeout(connect, 2000);
    };
  }, [streamId, appendMessage, mergeMessages]);

  useEffect(() => {
    lastMessageIdRef.current = null;
    setMessages([]);
    setStatus("connecting");
    connect();
    void pollMessages();
    pollRef.current = setInterval(() => {
      pollMessagesRef.current();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        pollMessagesRef.current();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("pageshow", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("pageshow", onVisible);
      sourceRef.current?.close();
      if (retryRef.current) clearTimeout(retryRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      setStatus("offline");
    };
  }, [connect, pollMessages]);

  return { messages, status, appendMessage, syncChat: pollMessages };
}
