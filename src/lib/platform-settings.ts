import { prisma } from "./db";
import { WELCOME_BONUS } from "./constants";

const SETTINGS_ID = "platform_settings";

export type PlatformSettings = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  welcomeBonus: number;
  signupEnabled: boolean;
  betaBannerEnabled: boolean;
  supportEmailAlerts: boolean;
  inStreamAdEnabled: boolean;
  inStreamAdLabel: string;
  inStreamAdUrl: string;
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  maintenanceMode: false,
  maintenanceMessage: "LiveBooth is undergoing maintenance. We'll be back shortly.",
  welcomeBonus: WELCOME_BONUS,
  signupEnabled: true,
  betaBannerEnabled: true,
  supportEmailAlerts: true,
  inStreamAdEnabled: false,
  inStreamAdLabel: "Partner with LiveBooth",
  inStreamAdUrl: "https://livebooth.uk/support",
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const row = await prisma.platformStats.findUnique({ where: { id: SETTINGS_ID } });
  if (!row?.value) return { ...DEFAULT_PLATFORM_SETTINGS };
  try {
    const parsed = JSON.parse(row.value) as Partial<PlatformSettings>;
    return { ...DEFAULT_PLATFORM_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_PLATFORM_SETTINGS };
  }
}

export async function savePlatformSettings(partial: Partial<PlatformSettings>): Promise<PlatformSettings> {
  const current = await getPlatformSettings();
  const next = { ...current, ...partial };
  await prisma.platformStats.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  return next;
}

export async function getWelcomeBonus(): Promise<number> {
  const s = await getPlatformSettings();
  return s.welcomeBonus;
}
