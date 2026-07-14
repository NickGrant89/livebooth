import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import {
  getOwnedStation,
  getStationStats,
  getTierMeta,
} from "@/lib/stations";
import {
  getStationFollowCount,
  getStationStakeTotal,
  getStationMilestoneProgress,
  listTopStationStakers,
} from "@/lib/station-staking";
import { stationAllowsEmbed } from "@/lib/schedule-import";
import { normalizeStationSlug, validateStationSlug } from "@/lib/station-slug";
import { getStationOwnerEarnings } from "@/lib/stations-discover";
import { sanitizeProfileImageUrl } from "@/lib/profile-images";
import { z } from "zod";

const createSchema = z.object({
  slug: z.string().min(3).max(32),
  name: z.string().min(1).max(80),
  tagline: z.string().max(200).optional(),
  avatar: z.string().max(4).optional(),
});

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  tagline: z.string().max(200).optional(),
  avatar: z.string().max(4).optional(),
  avatarUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  relayUrl: z.string().url().optional().nullable(),
  embedPrimaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  embedHideBranding: z.boolean().optional(),
  flagshipDjUsername: z.string().optional().nullable(),
});

export async function GET() {
  const session = await getSessionUser();
  if (!session) return error("Unauthorized", 401);

  const station = await getOwnedStation(session.id);
  if (!station) {
    if (session.role === "station" || session.role === "admin") {
      return json({
        setupRequired: true,
        suggestedSlug: session.username,
        suggestedName: session.displayName,
      });
    }
    return error("No station owned by this account", 404);
  }

  const tierMeta = getTierMeta(station.tier);
  const [stats, followerCount, stakeTotals, milestones, topStakers, earnings] =
    await Promise.all([
      tierMeta.stationDashboard ? getStationStats(station.id) : null,
      getStationFollowCount(station.id),
      getStationStakeTotal(station.id),
      getStationMilestoneProgress(station.id),
      listTopStationStakers(station.id, 10),
      getStationOwnerEarnings(session.id),
    ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3008";

  return json({
    station: {
      id: station.id,
      slug: station.slug,
      name: station.name,
      tagline: station.tagline,
      avatar: station.avatar,
      avatarUrl: station.avatarUrl,
      bannerUrl: station.bannerUrl,
      tier: station.tier,
      tierMeta,
      relayUrl: station.relayUrl,
      embedPrimaryColor: station.embedPrimaryColor,
      embedHideBranding: station.embedHideBranding,
      flagshipDj: station.flagshipDj,
      residents: station.residents.map((r) => ({
        id: r.id,
        showTitle: r.showTitle,
        slotDay: r.slotDay,
        slotHour: r.slotHour,
        slotLabel: r.slotLabel,
        dj: r.dj,
      })),
    },
    stats: stats
      ? { ...stats, followerCount, totalStaked: stakeTotals.total, stakerCount: stakeTotals.stakers }
      : { followerCount, totalStaked: stakeTotals.total, stakerCount: stakeTotals.stakers },
    earnings,
    milestones,
    topStakers: topStakers.map((s) => ({
      username: s.fan.username,
      displayName: s.fan.displayName,
      avatar: s.fan.avatar,
      amount: s.amount,
    })),
    embed: stationAllowsEmbed(station.tier)
      ? {
          url: `${appUrl}/embed/station/${station.slug}`,
          snippet: `<iframe src="${appUrl}/embed/station/${station.slug}" width="100%" height="420" frameborder="0" allow="autoplay; fullscreen" title="${station.name} live"></iframe>`,
        }
      : null,
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  if (auth.role !== "station" && auth.role !== "admin") {
    return error("Station accounts only — sign up with the Radio station role", 403);
  }

  const existing = await prisma.radioStation.findUnique({ where: { ownerId: auth.id } });
  if (existing) {
    return error("You already have a station — edit it in the dashboard below", 400);
  }

  try {
    const body = createSchema.parse(await request.json());
    const slug = normalizeStationSlug(body.slug);
    const slugError = validateStationSlug(slug);
    if (slugError) return error(slugError, 400);

    const slugTaken = await prisma.radioStation.findUnique({ where: { slug } });
    if (slugTaken) return error("That station URL is already taken — try another slug", 409);

    const station = await prisma.radioStation.create({
      data: {
        slug,
        name: body.name.trim(),
        tagline: body.tagline?.trim() ?? "",
        avatar: body.avatar?.trim() || auth.displayName.slice(0, 2).toUpperCase(),
        tier: "community",
        ownerId: auth.id,
      },
    });

    return json({
      station: {
        id: station.id,
        slug: station.slug,
        name: station.name,
        tagline: station.tagline,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid station data");
    console.error("station owner create:", e);
    return error("Failed to create station", 500);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const station = await prisma.radioStation.findUnique({ where: { ownerId: auth.id } });
  if (!station) return error("No station owned by this account", 404);

  try {
    const body = patchSchema.parse(await request.json());
    const tierMeta = getTierMeta(station.tier);

    let flagshipDjId: string | null | undefined = undefined;
    if (body.flagshipDjUsername !== undefined) {
      if (body.flagshipDjUsername === null || body.flagshipDjUsername === "") {
        flagshipDjId = null;
      } else {
        const resident = await prisma.stationResident.findFirst({
          where: {
            stationId: station.id,
            dj: { username: body.flagshipDjUsername.replace(/^@/, "") },
          },
          include: { dj: true },
        });
        if (!resident) {
          return error("Flagship DJ must be a station resident", 400);
        }
        flagshipDjId = resident.djId;
      }
    }

    if (body.embedHideBranding && !tierMeta.whiteLabel) {
      return error("Hide branding requires Network tier", 403);
    }

    if (body.relayUrl !== undefined && body.relayUrl !== null && !tierMeta.relayMode) {
      return error("Relay URL requires Pro tier or higher — ask an admin to upgrade your station", 403);
    }

    if (
      (body.embedPrimaryColor !== undefined || body.embedHideBranding !== undefined) &&
      !stationAllowsEmbed(station.tier)
    ) {
      return error("Embed player requires Pro tier or higher", 403);
    }

    const data: {
      name?: string;
      tagline?: string;
      avatar?: string;
      avatarUrl?: string;
      bannerUrl?: string;
      relayUrl?: string | null;
      embedPrimaryColor?: string;
      embedHideBranding?: boolean;
      flagshipDjId?: string | null;
    } = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.tagline !== undefined) data.tagline = body.tagline;
    if (body.avatar !== undefined) data.avatar = body.avatar;
    if (body.avatarUrl !== undefined) {
      try {
        data.avatarUrl = sanitizeProfileImageUrl(body.avatarUrl, 400_000);
      } catch (e) {
        return error(e instanceof Error ? e.message : "Invalid station logo");
      }
    }
    if (body.bannerUrl !== undefined) {
      try {
        data.bannerUrl = sanitizeProfileImageUrl(body.bannerUrl, 600_000);
      } catch (e) {
        return error(e instanceof Error ? e.message : "Invalid banner image");
      }
    }
    if (tierMeta.relayMode && body.relayUrl !== undefined) data.relayUrl = body.relayUrl;
    if (stationAllowsEmbed(station.tier)) {
      if (body.embedPrimaryColor !== undefined) data.embedPrimaryColor = body.embedPrimaryColor;
      if (body.embedHideBranding !== undefined) data.embedHideBranding = body.embedHideBranding;
    }
    if (flagshipDjId !== undefined) data.flagshipDjId = flagshipDjId;

    const updated = await prisma.radioStation.update({
      where: { id: station.id },
      data,
    });

    return json({ station: updated });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid station data");
    console.error("station owner patch:", e);
    return error("Failed to update station", 500);
  }
}
