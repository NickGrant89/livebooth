"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessagePayload } from "@/lib/chat-hub";

export type ChatConnectionStatus = "connecting" | "live" | "reconnecting" | "offline";

const POLL_MS = 4000;

function isNearDuplicate(a: ChatMessagePayload, b: ChatMessagePayload): boolean {
  if (a.id === b.id) return true;
  if (a.userId && b.userId && a.userId !== b.userId) return false;
  if (a.username !== b.username || a.message !== b.message) return false;
  return (
    Math.abs(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) <= 3000
  );
}

function mergeChatMessages(
  prev: ChatMessagePayload[],
  incoming: ChatMessagePayload[],
): ChatMessagePayload[] {
  if (incoming.length === 0) return prev;
  const merged = [...prev];
  for (const msg of incoming) {
    const dupeIdx = merged.findIndex((existing) => isNearDuplicate(existing, msg));
    if (dupeIdx >= 0) {
      merged[dupeIdx] = msg;
      continue;
    }
    merged.push(msg);
  }
  return merged
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-100);
}

export function useStreamChat(streamId: string) {
  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
  const [status, setStatus] = useState<ChatConnectionStatus>("connecting");
  const sourceRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseHealthyRef = useRef(false);
  const lastMessageAtRef = useRef<string | null>(null);

  const mergeMessages = useCallback((incoming: ChatMessagePayload[]) => {
    setMessages((prev) => {
      const merged = mergeChatMessages(prev, incoming);
      if (merged.length > 0) {
        lastMessageAtRef.current = merged[merged.length - 1]!.createdAt;
      }
      return merged;
    });
  }, []);

  const appendMessage = useCallback((msg: ChatMessagePayload) => {
    mergeMessages([msg]);
  }, [mergeMessages]);

  const pollMessages = useCallback(async () => {
    const since = lastMessageAtRef.current;
    const url = since
      ? `/api/chat/${streamId}?since=${encodeURIComponent(since)}`
      : `/api/chat/${streamId}`;

    try {
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) return;
      const data = (await res.json()) as { messages?: ChatMessagePayload[] };
      if (data.messages?.length) {
        mergeMessages(data.messages);
      }
      if (!sseHealthyRef.current) {
        setStatus("live");
      }
    } catch {
      /* polling is best-effort */
    }
  }, [streamId, mergeMessages]);

  const connect = useCallback(() => {
    sourceRef.current?.close();
    if (retryRef.current) clearTimeout(retryRef.current);

    setStatus((s) => (s === "live" ? "reconnecting" : "connecting"));
    sseHealthyRef.current = false;

    const source = new EventSource(`/api/chat/${streamId}/stream`);
    sourceRef.current = source;

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as
          | { type: "history"; messages: ChatMessagePayload[] }
          | { type: "message"; message: ChatMessagePayload };

        sseHealthyRef.current = true;
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
      sseHealthyRef.current = false;
      source.close();
      sourceRef.current = null;
      setStatus("reconnecting");
      retryRef.current = setTimeout(connect, 2000);
    };
  }, [streamId, appendMessage, mergeMessages]);

  useEffect(() => {
    lastMessageAtRef.current = null;
    setMessages([]);
    setStatus("connecting");
    connect();
    void pollMessages();
    pollRef.current = setInterval(() => {
      void pollMessages();
    }, POLL_MS);

    return () => {
      sourceRef.current?.close();
      if (retryRef.current) clearTimeout(retryRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      sseHealthyRef.current = false;
      setStatus("offline");
    };
  }, [connect, pollMessages]);

  return { messages, status, appendMessage };
}
