"use client";

import { StreamMobileTabs } from "@/components/StreamMobileTabs";

interface StreamPageLayoutProps {
  watch: React.ReactNode;
  chat: React.ReactNode;
}

export function StreamPageLayout({ watch, chat }: StreamPageLayoutProps) {
  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-4rem)] w-full max-w-[100vw] overflow-hidden mx-auto">
      <StreamMobileTabs watch={watch} chat={chat} />
    </div>
  );
}
