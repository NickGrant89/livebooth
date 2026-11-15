import type { Metadata, Viewport } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { getAuthUserForClient } from "@/lib/session-user";
import { buildOgImageUrl, getSiteUrl } from "@/lib/share";
import "./globals.css";

const siteUrl = getSiteUrl();
const ogImage = buildOgImageUrl({
  type: "home",
  dj: "Live from the booth.",
  title: "Tip the drop.",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const description =
  "Stream DJ sets from the booth. Tip creators, grow your audience, cash out your earnings.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "LiveBooth — Live DJ Streaming",
  description,
  openGraph: {
    title: "LiveBooth — Live DJ Streaming",
    description,
    url: siteUrl,
    siteName: "LiveBooth",
    type: "website",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "LiveBooth — tip the drop" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LiveBooth — Live DJ Streaming",
    description,
    images: [ogImage],
  },
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
