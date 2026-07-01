import "dotenv/config";
import { createPrismaClient } from "../src/lib/create-prisma-client";
import bcrypt from "bcryptjs";
import { ACHIEVEMENTS } from "../src/lib/constants";

const prisma = createPrismaClient();

function demoUsersEnabled(): boolean {
  return process.env.SEED_DEMO_USERS === "true";
}

async function seedAchievements() {
  for (const ach of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { id: ach.id },
      create: {
        id: ach.id,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        tier: ach.tier,
        rewardTokens: ach.rewardTokens,
        requirement: ach.requirement,
        category: ach.category,
        audience: ach.audience,
        metricKey: ach.metricKey,
        threshold: ach.threshold,
      },
      update: {},
    });
  }
  console.log(`✓ ${ACHIEVEMENTS.length} achievements`);
}

/** Production: set SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD (never use password123). */
async function seedAdminFromEnv() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const username = process.env.SEED_ADMIN_USERNAME?.trim() || "admin";

  if (!email || !password) return;

  if (password === "password123") {
    throw new Error("Refusing to seed admin with password123 — choose a strong SEED_ADMIN_PASSWORD");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { username },
    create: {
      username,
      email,
      passwordHash,
      displayName: "Platform Admin",
      avatar: "AD",
      role: "admin",
      balance: { create: { balance: 0, totalEarned: 0 } },
    },
    update: { role: "admin", email, passwordHash },
  });
  console.log(`✓ Admin user @${username} (${email}) — store password securely, not in git`);
}

async function seedDemoContent() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const djs = [
    { username: "neonpulse", displayName: "Neon Pulse", avatar: "NP", bio: "Underground techno from Berlin.", genres: '["techno","house"]', role: "dj" },
    { username: "bassqueen", displayName: "Bass Queen", avatar: "BQ", bio: "DnB & jungle specialist.", genres: '["drum-bass","hip-hop"]', role: "dj" },
    { username: "discodave", displayName: "Disco Dave", avatar: "DD", bio: "Vinyl only sets every Friday.", genres: '["disco","house"]', role: "dj" },
    { username: "tranceangel", displayName: "Trance Angel", avatar: "TA", bio: "Uplifting trance & progressive.", genres: '["trance","ambient"]', role: "dj" },
    { username: "lofiwizard", displayName: "Lo-Fi Wizard", avatar: "LW", bio: "Chill beats for late night.", genres: '["ambient","hip-hop"]', role: "dj" },
    { username: "hypemaster", displayName: "Hype Master", avatar: "HM", bio: "Open format.", genres: '["hip-hop","house","drum-bass"]', role: "dj" },
  ];

  const djUsers = [];
  for (const dj of djs) {
    const user = await prisma.user.upsert({
      where: { username: dj.username },
      create: {
        ...dj,
        email: `${dj.username}@livebooth.local`,
        passwordHash,
      },
      update: {},
    });
    await prisma.beatBalance.upsert({
      where: { userId: user.id },
      create: { userId: user.id, balance: 1000, totalEarned: 3000 + Math.random() * 5000 },
      update: {},
    });
    djUsers.push(user);
  }

  await prisma.user.upsert({
    where: { username: "demo" },
    create: {
      username: "demo",
      email: "demo@livebooth.local",
      passwordHash,
      displayName: "Demo Fan",
      avatar: "DF",
      role: "fan",
      balance: { create: { balance: 500, totalEarned: 0 } },
    },
    update: {},
  });

  const stationOwner = await prisma.user.upsert({
    where: { username: "kxradio" },
    create: {
      username: "kxradio",
      email: "kxradio@livebooth.local",
      passwordHash,
      displayName: "KX Radio",
      avatar: "KX",
      bio: "Underground radio network — live streams & FM simulcast.",
      role: "station",
    },
    update: { role: "station" },
  });

  await prisma.beatBalance.upsert({
    where: { userId: stationOwner.id },
    create: { userId: stationOwner.id, balance: 2000, totalEarned: 0 },
    update: {},
  });

  const kxStation = await prisma.radioStation.upsert({
    where: { slug: "kxradio" },
    create: {
      slug: "kxradio",
      name: "KX Radio",
      tagline: "Tip the drop — 24/7 underground",
      avatar: "KX",
      tier: "pro",
      relayUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      ownerId: stationOwner.id,
    },
    update: {},
  });

  const demoUser = await prisma.user.findUnique({ where: { username: "demo" } });
  if (demoUser) {
    await prisma.beatBalance.upsert({
      where: { userId: demoUser.id },
      create: { userId: demoUser.id, balance: 500, totalEarned: 0 },
      update: {},
    });
  }

  for (const [idx, dj] of djUsers.entries()) {
    if (idx < 2) {
      await prisma.stationResident.upsert({
        where: { stationId_djId: { stationId: kxStation.id, djId: dj.id } },
        create: {
          stationId: kxStation.id,
          djId: dj.id,
          showTitle: idx === 0 ? "Neon Pulse — Techno Hour" : "Bass Queen — Liquid Sessions",
          slotDay: idx === 0 ? 1 : 3,
          slotHour: idx === 0 ? 20 : 22,
          slotLabel: idx === 0 ? "Techno Monday" : "DnB Wednesday",
        },
        update: {},
      });
    }
  }

  await prisma.radioStation.update({
    where: { id: kxStation.id },
    data: { flagshipDjId: djUsers[0].id },
  });

  if (demoUser) {
    await prisma.stationFollow.upsert({
      where: { followerId_stationId: { followerId: demoUser.id, stationId: kxStation.id } },
      create: { followerId: demoUser.id, stationId: kxStation.id },
      update: {},
    });
    await prisma.stationStake.upsert({
      where: { fanId_stationId: { fanId: demoUser.id, stationId: kxStation.id } },
      create: { fanId: demoUser.id, stationId: kxStation.id, amount: 100 },
      update: { amount: 100 },
    });
  }

  const liveTitles: Record<string, string> = {
    neonpulse: "Deep Techno Sunday Session",
    bassqueen: "Liquid DnB Vibes",
    discodave: "Friday Night Disco Fever",
    lofiwizard: "Late Night Lo-Fi Study Beats",
  };

  const liveEngagement: Record<string, { peakViewers: number; totalTips: number }> = {
    neonpulse: { peakViewers: 1240, totalTips: 380 },
    bassqueen: { peakViewers: 890, totalTips: 210 },
    discodave: { peakViewers: 620, totalTips: 95 },
    lofiwizard: { peakViewers: 410, totalTips: 45 },
  };

  for (const dj of djUsers) {
    const isLive = dj.username in liveTitles;
    if (!isLive) continue;

    const existing = await prisma.stream.findFirst({
      where: { djId: dj.id, status: "live" },
    });
    if (existing) continue;

    const engagement = liveEngagement[dj.username] ?? { peakViewers: 300, totalTips: 0 };
    const stream = await prisma.stream.create({
      data: {
        djId: dj.id,
        title: liveTitles[dj.username],
        genre: JSON.parse(dj.genres)[0],
        status: "live",
        ingestKey: `lb_${dj.username}_${Date.now()}`,
        playbackUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        peakViewers: engagement.peakViewers,
        totalTips: engagement.totalTips,
        startedAt: new Date(Date.now() - Math.random() * 7200000),
        stationId: dj.username === "neonpulse" || dj.username === "bassqueen" ? kxStation.id : undefined,
      },
    });
    await prisma.nowPlaying.create({
      data: {
        streamId: stream.id,
        title: "Innerbloom",
        artist: "RÜFÜS DU SOL",
        bpm: 122,
        musicalKey: "Am",
      },
    });
    await prisma.chatMessage.createMany({
      data: [
        {
          streamId: stream.id,
          userId: demoUser?.id,
          username: demoUser?.username ?? "demo",
          message: "this set is fire 🔥",
          isTip: false,
        },
        {
          streamId: stream.id,
          userId: demoUser?.id,
          username: demoUser?.username ?? "demo",
          message: "what track is this??",
          isTip: false,
        },
        {
          streamId: stream.id,
          username: "crypto_dancer",
          message: "just tipped 50 DROP",
          isTip: true,
          tipAmount: 50,
        },
      ],
    });
  }

  if (demoUser) {
    const live = await prisma.stream.findMany({ where: { status: "live" }, select: { id: true } });
    for (const { id: streamId } of live) {
      const orphan = await prisma.chatMessage.findMany({
        where: { streamId, userId: null, isTip: false },
        orderBy: { createdAt: "asc" },
        take: 2,
      });
      for (const msg of orphan) {
        await prisma.chatMessage.update({
          where: { id: msg.id },
          data: { userId: demoUser.id, username: demoUser.username },
        });
      }
    }
  }

  await prisma.stream.create({
    data: {
      djId: djUsers[0].id,
      title: "Warehouse Techno Replay",
      genre: "techno",
      status: "ended",
      playbackUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      vodUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      peakViewers: 920,
      totalTips: 450,
      startedAt: new Date(Date.now() - 86400000 * 2),
      endedAt: new Date(Date.now() - 86400000 * 2 + 7200000),
    },
  });

  await prisma.user.upsert({
    where: { username: "admin" },
    create: {
      username: "admin",
      email: "admin@livebooth.local",
      passwordHash,
      displayName: "Platform Admin",
      avatar: "AD",
      role: "admin",
    },
    update: { role: "admin" },
  });

  console.log("✓ Demo users + live streams (password123 — local only)");
  console.log("  Fan:  demo@livebooth.local");
  console.log("  DJ:   neonpulse@livebooth.local");
  console.log("  Admin: admin@livebooth.local → /admin");
}

async function main() {
  console.log("Seeding database...\n");

  await seedAchievements();
  await seedAdminFromEnv();

  if (demoUsersEnabled()) {
    await seedDemoContent();
  } else {
    console.log("⊘ Demo users skipped (set SEED_DEMO_USERS=true for local demo accounts)");
  }

  console.log("\nSeed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
