"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessagePayload } from "@/lib/chat-hub";

export type ChatConnectionStatus = "connecting" | "live" | "reconnecting" | "offline";

export function useStreamChat(streamId: string) {
  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
  const [status, setStatus] = useState<ChatConnectionStatus>("connecting");
  const sourceRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const appendMessage = useCallback((msg: ChatMessagePayload) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg].slice(-100);
    });
  }, []);

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
          setMessages(payload.messages.slice(-100));
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
  }, [streamId, appendMessage]);

  useEffect(() => {
    connect();
    return () => {
      sourceRef.current?.close();
      if (retryRef.current) clearTimeout(retryRef.current);
      setStatus("offline");
    };
  }, [connect]);

  return { messages, status, appendMessage };
}
