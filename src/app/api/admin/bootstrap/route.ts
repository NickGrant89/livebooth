import { prisma } from "@/lib/db";
import { json, error } from "@/lib/api-utils";

/** One-time admin promotion — set ADMIN_BOOTSTRAP_SECRET on Vercel, then POST once. */
export async function POST(request: Request) {
  const secret = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!secret) return error("Bootstrap not configured", 503);

  let body: { email?: string; token?: string };
  try {
    body = (await request.json()) as { email?: string; token?: string };
  } catch {
    return error("Invalid body", 400);
  }

  if (!body.email || body.token !== secret) {
    return error("Invalid credentials", 403);
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: body.email.toLowerCase() }, { username: body.email.toLowerCase() }],
    },
  });
  if (!user) return error("User not found — sign up first, then bootstrap", 404);

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "admin" },
  });

  return json({
    ok: true,
    message: `Promoted ${user.username} to admin. Sign in at /login?next=/admin`,
  });
}
