"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useStreamChat, type ChatConnectionStatus } from "@/hooks/useStreamChat";
import type { ChatMessagePayload } from "@/lib/chat-hub";

type StreamChatContextValue = {
  messages: ChatMessagePayload[];
  status: ChatConnectionStatus;
  appendMessage: (msg: ChatMessagePayload) => void;
  syncChat: () => void;
};

const StreamChatContext = createContext<StreamChatContextValue | null>(null);

export function StreamChatProvider({
  streamId,
  children,
}: {
  streamId: string;
  children: ReactNode;
}) {
  const chat = useStreamChat(streamId);
  return <StreamChatContext.Provider value={chat}>{children}</StreamChatContext.Provider>;
}

export function useStreamChatContext() {
  const ctx = useContext(StreamChatContext);
  if (!ctx) {
    throw new Error("useStreamChatContext must be used within StreamChatProvider");
  }
  return ctx;
}
