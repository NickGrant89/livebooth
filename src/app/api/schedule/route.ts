import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { z } from "zod";

const schema = z.object({
  weeklySlotDay: z.number().int().min(0).max(6).nullable(),
  weeklySlotHour: z.number().int().min(0).max(23).nullable(),
  weeklySlotLabel: z.string().max(80).nullable(),
});

export async function GET() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const user = await prisma.user.findUnique({
    where: { id: auth.id },
    select: {
      weeklySlotDay: true,
      weeklySlotHour: true,
      weeklySlotLabel: true,
      streamStreak: true,
      role: true,
    },
  });
  if (!user) return error("Not found", 404);

  return json({ schedule: user, streamStreak: user.streamStreak });
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  if (auth.role !== "dj" && auth.role !== "admin") {
    return error("DJs only", 403);
  }

  try {
    const body = schema.parse(await request.json());
    const user = await prisma.user.update({
      where: { id: auth.id },
      data: {
        weeklySlotDay: body.weeklySlotDay,
        weeklySlotHour: body.weeklySlotHour,
        weeklySlotLabel: body.weeklySlotLabel ?? "",
      },
      select: {
        weeklySlotDay: true,
        weeklySlotHour: true,
        weeklySlotLabel: true,
        streamStreak: true,
      },
    });
    return json({ schedule: user });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid schedule");
    return error("Update failed", 500);
  }
}
