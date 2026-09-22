import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { GENRES, CREATOR_TYPES, type CreatorType } from "@/lib/constants";
import { json, error, requireApiUser, isApiError, serializeUser } from "@/lib/api-utils";
import { sanitizeProfileImageUrl } from "@/lib/profile-images";
import { serializeSocialLinks, type SocialLinks } from "@/lib/profile-social";

const socialLinksSchema = z.record(
  z.enum(["instagram", "soundcloud", "mixcloud", "twitter", "website"]),
  z.string().max(200),
);

const updateSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().min(1).max(8).optional(),
  avatarUrl: z.string().max(600_000).optional(),
  bannerUrl: z.string().max(600_000).optional(),
  genres: z.array(z.enum(GENRES)).max(5).optional(),
  creatorType: z.enum(CREATOR_TYPES).optional(),
  socialLinks: socialLinksSchema.optional(),
  featuredStreamId: z.string().nullable().optional(),
  currentPassword: z.string().min(6).optional(),
  newPassword: z.string().min(6).optional(),
});

import { getOwnedStation } from "@/lib/stations";

export async function GET() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const user = await prisma.user.findUnique({
    where: { id: auth.id },
    include: {
      balance: true,
      _count: { select: { followers: true, following: true } },
    },
  });
  if (!user) return error("User not found", 404);

  const station =
    user.role === "station"
      ? await getOwnedStation(user.id).then((s) =>
          s ? { slug: s.slug, name: s.name } : null,
        )
      : null;

  return json({
    user: {
      ...serializeUser(user),
      email: user.email,
      station,
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  try {
    const body = updateSchema.parse(await request.json());

    if (body.newPassword && !body.currentPassword) {
      return error("Current password required to set a new password");
    }

    const user = await prisma.user.findUnique({ where: { id: auth.id } });
    if (!user) return error("User not found", 404);

    if (body.newPassword) {
      const valid = await bcrypt.compare(body.currentPassword!, user.passwordHash);
      if (!valid) return error("Current password is incorrect", 403);
    }

    const data: {
      displayName?: string;
      bio?: string;
      avatar?: string;
      avatarUrl?: string;
      bannerUrl?: string;
      genres?: string;
      creatorType?: string;
      passwordHash?: string;
      socialLinks?: string;
      featuredStreamId?: string | null;
    } = {};

    if (body.displayName !== undefined) data.displayName = body.displayName.trim();
    if (body.bio !== undefined) data.bio = body.bio.trim();
    if (body.avatar !== undefined) data.avatar = body.avatar.trim();
    if (body.avatarUrl !== undefined) {
      try {
        data.avatarUrl = sanitizeProfileImageUrl(body.avatarUrl, 400_000);
      } catch (e) {
        return error(e instanceof Error ? e.message : "Invalid profile photo");
      }
    }
    if (body.bannerUrl !== undefined) {
      try {
        data.bannerUrl = sanitizeProfileImageUrl(body.bannerUrl, 600_000);
      } catch (e) {
        return error(e instanceof Error ? e.message : "Invalid banner image");
      }
    }
    if (body.genres !== undefined) {
      if (user.role !== "dj" && user.role !== "admin") {
        return error("Only creators can set genres");
      }
      data.genres = JSON.stringify(body.genres);
    }
    if (body.creatorType !== undefined) {
      if (user.role !== "dj" && user.role !== "admin") {
        return error("Only creators can set creator type");
      }
      data.creatorType = body.creatorType;
    }
    if (body.socialLinks !== undefined) {
      data.socialLinks = serializeSocialLinks(body.socialLinks as SocialLinks);
    }
    if (body.featuredStreamId !== undefined) {
      if (user.role !== "dj" && user.role !== "admin" && user.role !== "station") {
        return error("Only creators can pin a featured replay");
      }
      if (body.featuredStreamId === null || body.featuredStreamId === "") {
        data.featuredStreamId = null;
      } else {
        const stream = await prisma.stream.findFirst({
          where: { id: body.featuredStreamId, djId: user.id, status: "ended" },
          select: { id: true },
        });
        if (!stream) return error("Stream not found in your archive", 404);
        data.featuredStreamId = stream.id;
      }
    }
    if (body.newPassword) {
      data.passwordHash = await bcrypt.hash(body.newPassword, 10);
    }

    if (Object.keys(data).length === 0) {
      return error("No changes provided");
    }

    const updated = await prisma.user.update({
      where: { id: auth.id },
      data,
      include: {
        balance: true,
        _count: { select: { followers: true, following: true } },
      },
    });

    return json({
      user: {
        ...serializeUser(updated),
        email: updated.email,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return error(e.issues[0]?.message ?? "Invalid input");
    console.error("profile update:", e);
    return error("Update failed", 500);
  }
}
