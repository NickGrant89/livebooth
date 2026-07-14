"use client";

import { usePathname } from "next/navigation";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DailyLoginBanner } from "@/components/DailyLoginBanner";
import { DemoHostBanner } from "@/components/DemoHostBanner";
import { BetaBanner } from "@/components/BetaBanner";
import { SupportChatWidget } from "@/components/SupportChatWidget";
import { MaintenanceGate } from "@/components/MaintenanceGate";
import type { AuthUser } from "@/context/AuthContext";

export function AppShell({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}) {
  const pathname = usePathname();
  const isEmbed = pathname?.startsWith("/embed");

  const isStream = pathname?.startsWith("/stream/");
  const isStationLive =
    pathname != null && /^\/station\/[^/]+\/live\/?$/.test(pathname);
  const isLiveBooth = isStream || isStationLive;

  if (isEmbed) {
    return <Providers initialUser={initialUser}>{children}</Providers>;
  }

  return (
    <Providers initialUser={initialUser}>
      <div
        className={`relative flex flex-col overflow-x-hidden max-w-[100vw] ${
          isLiveBooth ? "h-[100dvh] overflow-hidden" : "min-h-screen"
        }`}
      >
        <Navbar />
        {!isLiveBooth && <BetaBanner />}
        {!isLiveBooth && <DemoHostBanner />}
        {!isLiveBooth && <DailyLoginBanner />}
        <main
          className={`relative z-[1] flex-1 min-w-0 w-full min-h-0 ${
            isLiveBooth ? "flex flex-col overflow-hidden" : ""
          }`}
        >
          <MaintenanceGate>{children}</MaintenanceGate>
        </main>
        {!isLiveBooth && <Footer />}
        <SupportChatWidget />
      </div>
    </Providers>
  );
}
