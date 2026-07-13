import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";
import { json, error } from "@/lib/api-utils";
import { getPlatformSettings, getWelcomeBonus } from "@/lib/platform-settings";
import {
  emailVerificationEnabled,
  userNeedsEmailVerification,
} from "@/lib/email-verification";
import { sendUserVerificationEmail } from "@/lib/send-verification-email";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/),
  displayName: z.string().min(1).max(50),
  role: z.enum(["fan", "dj"]).default("fan"),
});

export async function POST(request: Request) {
  try {
    const platform = await getPlatformSettings();
    if (!platform.signupEnabled) return error("Signups are temporarily disabled", 403);

    const body = schema.parse(await request.json());
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { username: body.username }] },
    });
    if (existing) return error("Email or username already taken", 409);

    const passwordHash = await bcrypt.hash(body.password, 10);
    const welcomeBonus = await getWelcomeBonus();
    const verifyNow = !emailVerificationEnabled();
    const user = await prisma.user.create({
      data: {
        email: body.email,
        username: body.username,
        displayName: body.displayName,
        passwordHash,
        role: body.role,
        avatar: body.displayName.slice(0, 2).toUpperCase(),
        emailVerifiedAt: verifyNow ? new Date() : null,
        balance: { create: { balance: welcomeBonus, totalEarned: 0 } },
      },
    });

    if (userNeedsEmailVerification(user)) {
      const mail = await sendUserVerificationEmail(user);
      return json(
        {
          requiresVerification: true,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            role: user.role,
          },
          message: "Check your email to verify your account before signing in.",
          ...(process.env.NODE_ENV !== "production" && mail.devVerifyUrl
            ? { devVerifyUrl: mail.devVerifyUrl }
            : {}),
        },
        201,
      );
    }

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
