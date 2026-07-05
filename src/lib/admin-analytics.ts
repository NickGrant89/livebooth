import { prisma } from "./db";
import { isSupportTicketUnread } from "./support-ticket-unread";

function hoursBetween(start: Date, end: Date) {
  return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
}

export async function getAdminAnalytics() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86400000);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);

  const [
    totalUsers,
    newUsersToday,
    newUsersWeek,
    newUsersMonth,
    liveStreams,
    streamsToday,
    streamsWeek,
    tipsTodayAgg,
    tipsWeekAgg,
    tipsMonthAgg,
    endedWeek,
    openTickets,
    unreadCandidates,
    stations,
    pendingWithdrawals,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.stream.count({ where: { status: "live" } }),
    prisma.stream.count({ where: { startedAt: { gte: dayAgo } } }),
    prisma.stream.count({ where: { startedAt: { gte: weekAgo } } }),
    prisma.tip.aggregate({
      where: { createdAt: { gte: dayAgo } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.tip.aggregate({
      where: { createdAt: { gte: weekAgo } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.tip.aggregate({
      where: { createdAt: { gte: monthAgo } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.stream.findMany({
      where: { endedAt: { gte: weekAgo }, startedAt: { not: null } },
      select: { startedAt: true, endedAt: true },
    }),
    prisma.supportTicket.count({ where: { status: { in: ["open", "in_progress"] } } }),
    prisma.supportTicket.findMany({
      where: {
        status: { in: ["open", "in_progress"] },
        lastMessageRole: "user",
      },
      select: {
        status: true,
        lastMessageRole: true,
        lastMessageAt: true,
        adminReadAt: true,
      },
    }),
    prisma.radioStation.count(),
    prisma.withdrawalRequest.count({ where: { status: "pending" } }),
  ]);

  let streamHoursWeek = 0;
  for (const s of endedWeek) {
    if (s.startedAt && s.endedAt) {
      streamHoursWeek += hoursBetween(s.startedAt, s.endedAt);
    }
  }

  const unreadSupport = unreadCandidates.filter(isSupportTicketUnread).length;

  const activeSessions = await prisma.session.count({
    where: { expiresAt: { gt: now }, createdAt: { gte: dayAgo } },
  });

  return {
    users: {
      total: totalUsers,
      newToday: newUsersToday,
      newWeek: newUsersWeek,
      newMonth: newUsersMonth,
      activeSessions24h: activeSessions,
    },
    streams: {
      liveNow: liveStreams,
      startedToday: streamsToday,
      startedWeek: streamsWeek,
      hoursWeek: Math.round(streamHoursWeek * 10) / 10,
    },
    tips: {
      todayDrop: tipsTodayAgg._sum.amount ?? 0,
      todayCount: tipsTodayAgg._count,
      weekDrop: tipsWeekAgg._sum.amount ?? 0,
      weekCount: tipsWeekAgg._count,
      monthDrop: tipsMonthAgg._sum.amount ?? 0,
      monthCount: tipsMonthAgg._count,
    },
    support: { openTickets, unreadTickets: unreadSupport },
    stations: { total: stations },
    treasury: { pendingWithdrawals },
  };
}
