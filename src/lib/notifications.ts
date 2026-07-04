import { prisma } from "./db";
import { sendGoLivePushToFollowers } from "./web-push";

export async function notifyUser(
  userId: string,
  type: string,
  title: string,
  body: string,
  href?: string,
) {
  return prisma.notification.create({
    data: { userId, type, title, body, href },
  });
}

export async function notifyFollowersGoLive(
  djId: string,
  djName: string,
  username: string,
  streamTitle: string,
) {
  const followers = await prisma.follow.findMany({
    where: { followingId: djId },
    select: { followerId: true },
  });
  if (followers.length === 0) return 0;

  await prisma.notification.createMany({
    data: followers.map((f) => ({
      userId: f.followerId,
      type: "go_live",
      title: `${djName} is live`,
      body: `${streamTitle} — the drop starts now`,
      href: `/stream/${username}`,
    })),
  });

  const followerIds = followers.map((f) => f.followerId);
  sendGoLivePushToFollowers(followerIds, djName, streamTitle, username).catch((err) =>
    console.error("web push go-live:", err),
  );

  return followers.length;
}

/** Notify station followers when a resident DJ goes live under that station. */
export async function notifyStationFollowersResidentGoLive(
  stationId: string,
  djName: string,
  djUsername: string,
  streamTitle: string,
) {
  const station = await prisma.radioStation.findUnique({
    where: { id: stationId },
    select: { slug: true, name: true },
  });
  if (!station) return 0;

  const followers = await prisma.stationFollow.findMany({
    where: { stationId },
    select: { followerId: true },
  });
  if (followers.length === 0) return 0;

  const title = `${station.name} is on air`;
  const body = `${djName}: ${streamTitle}`;
  const href = `/stream/${djUsername}`;

  await prisma.notification.createMany({
    data: followers.map((f) => ({
      userId: f.followerId,
      type: "station_go_live",
      title,
      body,
      href,
    })),
  });

  const followerIds = followers.map((f) => f.followerId);
  sendGoLivePushToFollowers(followerIds, station.name, `${djName} — ${streamTitle}`, djUsername).catch(
    (err) => console.error("web push station go-live:", err),
  );

  return followers.length;
}

/** Notify station followers when the station video channel goes live. */
export async function notifyStationFollowersChannelGoLive(
  stationId: string,
  streamTitle: string,
) {
  const station = await prisma.radioStation.findUnique({
    where: { id: stationId },
    select: { slug: true, name: true },
  });
  if (!station) return 0;

  const followers = await prisma.stationFollow.findMany({
    where: { stationId },
    select: { followerId: true },
  });
  if (followers.length === 0) return 0;

  const title = `${station.name} is live`;
  const body = streamTitle;
  const href = `/station/${station.slug}/live`;

  await prisma.notification.createMany({
    data: followers.map((f) => ({
      userId: f.followerId,
      type: "station_channel_go_live",
      title,
      body,
      href,
    })),
  });

  const followerIds = followers.map((f) => f.followerId);
  sendGoLivePushToFollowers(
    followerIds,
    station.name,
    streamTitle,
    station.slug,
    `/station/${station.slug}/live`,
  ).catch((err) => console.error("web push station channel go-live:", err));

  return followers.length;
}

/** Remind DJ to share their booth link when they go live. */
export async function notifyDjShareReminder(
  djId: string,
  username: string,
  streamTitle: string,
) {
  await notifyUser(
    djId,
    "share_reminder",
    "You're live — share your booth",
    `Spread the word about "${streamTitle}" so fans can find you.`,
    `/stream/${username}`,
  );

  const { sendPushToUser } = await import("./web-push");
  sendPushToUser(djId, {
    title: "You're live — share your link",
    body: `${streamTitle} · tap to copy your booth URL`,
    url: `/stream/${username}`,
    tag: `share-reminder-${username}`,
  }).catch((err) => console.error("web push share reminder:", err));
}

export async function getUnreadNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  if (ids?.length) {
    await prisma.notification.updateMany({
      where: { userId, id: { in: ids } },
      data: { read: true },
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
