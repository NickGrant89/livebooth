import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";
import { json, error } from "@/lib/api-utils";
import { WELCOME_BONUS } from "@/lib/constants";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/),
  displayName: z.string().min(1).max(50),
  role: z.enum(["fan", "dj"]).default("fan"),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { username: body.username }] },
    });
    if (existing) return error("Email or username already taken", 409);

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        username: body.username,
        displayName: body.displayName,
        passwordHash,
        role: body.role,
        avatar: body.displayName.slice(0, 2).toUpperCase(),
        balance: { create: { balance: WELCOME_BONUS, totalEarned: 0 } },
      },
    });

    const jwt = await createSession(user.id);
    await setSessionCookie(jwt);

    return json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return error(e.issues[0]?.message ?? "Invalid input");
    return error("Signup failed", 500);
  }
}
