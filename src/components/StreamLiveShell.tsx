"use client";

import { StreamChatProvider } from "@/context/StreamChatContext";
import { StreamPageLayout } from "@/components/StreamPageLayout";

export function StreamLiveShell({
  streamId,
  watch,
  chat,
}: {
  streamId: string;
  watch: React.ReactNode;
  chat: React.ReactNode;
}) {
  return (
    <StreamChatProvider streamId={streamId}>
      <StreamPageLayout watch={watch} chat={chat} />
    </StreamChatProvider>
  );
}
