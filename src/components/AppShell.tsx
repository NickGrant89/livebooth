"use client";

import { usePathname } from "next/navigation";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DailyLoginBanner } from "@/components/DailyLoginBanner";
import { DemoHostBanner } from "@/components/DemoHostBanner";
import { BetaBanner } from "@/components/BetaBanner";
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

  if (isEmbed) {
    return <Providers initialUser={initialUser}>{children}</Providers>;
  }

  return (
    <Providers initialUser={initialUser}>
      <div className="relative flex min-h-screen flex-col overflow-x-hidden max-w-[100vw]">
        <Navbar />
        <BetaBanner />
        <DemoHostBanner />
        <DailyLoginBanner />
        <main className="relative z-[1] flex-1 min-w-0 w-full">{children}</main>
        {!isStream && <Footer />}
      </div>
    </Providers>
  );
}
