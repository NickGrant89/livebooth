export interface ChatMessagePayload {
  id: string;
  userId?: string | null;
  username: string;
  message: string;
  isTip?: boolean;
  tipAmount?: number;
  createdAt: string;
}

type Listener = (message: ChatMessagePayload) => void;

/** In-memory pub/sub per stream (single Node process; use Redis for multi-instance prod). */
class ChatHub {
  private rooms = new Map<string, Set<Listener>>();

  subscribe(streamId: string, listener: Listener): () => void {
    if (!this.rooms.has(streamId)) {
      this.rooms.set(streamId, new Set());
    }
    this.rooms.get(streamId)!.add(listener);
    return () => {
      const set = this.rooms.get(streamId);
      if (!set) return;
      set.delete(listener);
      if (set.size === 0) this.rooms.delete(streamId);
    };
  }

  publish(streamId: string, message: ChatMessagePayload) {
    const set = this.rooms.get(streamId);
    if (!set) return;
    for (const listener of set) {
      try {
        listener(message);
      } catch {
        /* ignore broken listener */
      }
    }
  }
}

const globalForChat = globalThis as unknown as { __liveboothChatHub?: ChatHub };

export function getChatHub(): ChatHub {
  if (!globalForChat.__liveboothChatHub) {
    globalForChat.__liveboothChatHub = new ChatHub();
  }
  return globalForChat.__liveboothChatHub;
}

export function publishChatMessage(streamId: string, message: ChatMessagePayload) {
  getChatHub().publish(streamId, message);
}

export function serializeChatMessage(msg: {
  id: string;
  userId?: string | null;
  username: string;
  message: string;
  isTip: boolean;
  tipAmount: number | null;
  createdAt: Date;
}): ChatMessagePayload {
  return {
    id: msg.id,
    userId: msg.userId,
    username: msg.username,
    message: msg.message,
    isTip: msg.isTip,
    tipAmount: msg.tipAmount ?? undefined,
    createdAt: msg.createdAt.toISOString(),
  };
}

export function broadcastChatMessage(
  streamId: string,
  msg: {
    id: string;
    userId?: string | null;
    username: string;
    message: string;
    isTip: boolean;
    tipAmount: number | null;
    createdAt: Date;
  },
) {
  publishChatMessage(streamId, serializeChatMessage(msg));
}
