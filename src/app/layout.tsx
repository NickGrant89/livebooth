import type { Metadata, Viewport } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { getAuthUserForClient } from "@/lib/session-user";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LiveBooth — Live DJ Streaming",
  description: "Stream DJ sets from the booth. Earn DROP on VeChain. Tip the drop.",
};

export const viewport: Viewport = {
  themeColor: "#030304",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const initialUser = await getAuthUserForClient();

  return (
    <html lang="en" className={`${outfit.variable} ${jetbrains.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <AppShell initialUser={initialUser}>{children}</AppShell>
      </body>
    </html>
  );
}
