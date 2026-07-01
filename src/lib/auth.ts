import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "livebooth-dev-secret-change-in-production",
);

const COOKIE_NAME = "lb_session";
const LEGACY_COOKIE = "gk_session";
const SESSION_DAYS = 30;

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  avatar: string;
}

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const token = crypto.randomUUID();

  await prisma.session.create({
    data: { userId, token, expiresAt },
  });

  const jwt = await new SignJWT({ sub: userId, sid: token })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(SECRET);

  return jwt;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const jwt =
    cookieStore.get(COOKIE_NAME)?.value ??
    cookieStore.get(LEGACY_COOKIE)?.value;
  if (!jwt) return null;

  try {
    const { payload } = await jwtVerify(jwt, SECRET);
    const userId = payload.sub as string;
    const sid = payload.sid as string;

    const session = await prisma.session.findFirst({
      where: { token: sid, userId, expiresAt: { gt: new Date() } },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            displayName: true,
            role: true,
            avatar: true,
          },
        },
      },
    });

    return session?.user ?? null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(jwt: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const jwt = cookieStore.get(COOKIE_NAME)?.value;
  if (jwt) {
    try {
      const { payload } = await jwtVerify(jwt, SECRET);
      const sid = payload.sid as string;
      await prisma.session.deleteMany({ where: { token: sid } });
    } catch {
      /* ignore */
    }
  }
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete(LEGACY_COOKIE);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
