import { getSessionUser } from "@/lib/auth";
import { evaluateAchievements } from "@/lib/achievements";
import { bumpQuestProgress } from "@/lib/quests";
import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const session = await getSessionUser();
  const { username } = await params;

  if (!session) return json({ following: false });

  const dj = await prisma.user.findUnique({ where: { username } });
  if (!dj) return error("User not found", 404);

  const follow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId: session.id, followingId: dj.id },
    },
  });

  return json({ following: Boolean(follow) });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { username } = await params;

  const dj = await prisma.user.findUnique({ where: { username } });
  if (!dj) return error("User not found", 404);
  if (dj.id === auth.id) return error("Cannot follow yourself", 400);

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId: auth.id, followingId: dj.id },
    },
  });

  await prisma.follow.upsert({
    where: {
      followerId_followingId: { followerId: auth.id, followingId: dj.id },
    },
    create: { followerId: auth.id, followingId: dj.id },
    update: {},
  });

  if (!existing) {
    await bumpQuestProgress(auth.id, "follows", 1);
  }

  await evaluateAchievements(dj.id);

  return json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { username } = await params;
  const dj = await prisma.user.findUnique({ where: { username } });
  if (!dj) return error("Not found", 404);

  await prisma.follow.deleteMany({
    where: { followerId: auth.id, followingId: dj.id },
  });

  return json({ ok: true });
}
