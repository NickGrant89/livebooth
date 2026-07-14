"use client";

import { useEffect } from "react";
import { StreamMobileTabs } from "@/components/StreamMobileTabs";

interface StreamPageLayoutProps {
  watch: React.ReactNode;
  chat: React.ReactNode;
}

export function StreamPageLayout({ watch, chat }: StreamPageLayoutProps) {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full max-w-[100vw] overflow-hidden mx-auto">
      <StreamMobileTabs watch={watch} chat={chat} />
    </div>
  );
}
