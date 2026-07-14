"use server";

import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, setSessionCookie, clearSessionCookie } from "@/lib/auth";
import { createTotpPendingToken } from "@/lib/admin-totp";
import { getOrCreateBalance } from "@/lib/ledger";
import { CREATOR_TYPES, type CreatorType } from "@/lib/constants";
import { getPlatformSettings, getWelcomeBonus } from "@/lib/platform-settings";
import { isRateLimitedFromHeaders } from "@/lib/rate-limit";
import {
  emailVerificationEnabled,
  maskEmail,
  userNeedsEmailVerification,
} from "@/lib/email-verification";
import { sendUserVerificationEmail } from "@/lib/send-verification-email";
import type { AuthFormState } from "@/app/actions/auth-types";

export type { AuthFormState } from "@/app/actions/auth-types";

const LOGIN_LIMIT = 15;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const SIGNUP_LIMIT = 8;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;

async function findUser(identifier: string) {
  const id = identifier.trim().toLowerCase();
  return prisma.user.findFirst({
    where: {
      OR: [{ email: id }, { username: id.replace(/@.*/, "") }],
    },
  });
}

function tooManyAttemptsMessage(): AuthFormState {
  return { error: "Too many attempts. Wait a few minutes and try again." };
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const headerStore = await headers();
  if (
    isRateLimitedFromHeaders(headerStore, "login-action", LOGIN_LIMIT, LOGIN_WINDOW_MS)
  ) {
    return tooManyAttemptsMessage();
  }

  const identifier = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "Enter email/username and password" };
  }

  let role = "fan";
  try {
    const user = await findUser(identifier);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return { error: "Invalid email/username or password" };
    }

    if (user.suspendedAt) {
      return {
        error: user.suspendedReason ?? "This account has been suspended. Contact support@livebooth.uk",
      };
    }

    if (userNeedsEmailVerification(user)) {
      return {
        requiresVerification: true,
        email: maskEmail(user.email),
        error: "Verify your email before signing in. Check your inbox for the verification link.",
      };
    }

    if (user.role === "admin" && user.totpEnabled) {
      const pendingToken = await createTotpPendingToken(user.id);
      return { requiresTotp: true, pendingToken, username: user.username };
    }

    role = user.role;
    const jwt = await createSession(user.id);
    await setSessionCookie(jwt);
  } catch (e) {
    console.error("loginAction:", e);
    return { error: "Login failed — try again" };
  }

  const next = String(formData.get("next") ?? "").trim();
  if (next.startsWith("/") && !next.startsWith("//")) {
    redirect(next);
  }

  if (role === "admin") redirect("/admin");
  redirect("/");
}

export async function signupAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const headerStore = await headers();
  if (
    isRateLimitedFromHeaders(headerStore, "signup-action", SIGNUP_LIMIT, SIGNUP_WINDOW_MS)
  ) {
    return tooManyAttemptsMessage();
  }

  const displayName = String(formData.get("displayName") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "fan");
  const creatorTypeRaw = String(formData.get("creatorType") ?? "dj");
  const creatorType = CREATOR_TYPES.includes(creatorTypeRaw as CreatorType)
    ? creatorTypeRaw
    : "dj";

  if (!displayName || !username || !email || password.length < 6) {
    return { error: "Fill all fields — password min 6 characters" };
  }

  if (!/^[a-z0-9_]+$/.test(username)) {
    return { error: "Username: lowercase letters, numbers, underscore only" };
  }

  const platform = await getPlatformSettings();
  if (!platform.signupEnabled) {
    return { error: "Signups are temporarily disabled" };
  }

  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) return { error: "Email or username already taken" };

    const passwordHash = await bcrypt.hash(password, 10);
    const verifyNow = !emailVerificationEnabled();
    const user = await prisma.user.create({
      data: {
        email,
        username,
        displayName,
        passwordHash,
        role: role === "dj" ? "dj" : role === "station" ? "station" : "fan",
        creatorType: role === "dj" ? creatorType : "dj",
        avatar: displayName.slice(0, 2).toUpperCase(),
        emailVerifiedAt: verifyNow ? new Date() : null,
      },
    });
    await getOrCreateBalance(user.id);
    const welcomeBonus = await getWelcomeBonus();
    await prisma.beatBalance.update({
      where: { userId: user.id },
      data: { balance: welcomeBonus },
    });

    if (userNeedsEmailVerification(user)) {
      await sendUserVerificationEmail(user);
      redirect(`/verify-email?email=${encodeURIComponent(email)}`);
    }

    const jwt = await createSession(user.id);
    await setSessionCookie(jwt);
  } catch (e) {
    console.error("signupAction:", e);
    return { error: "Signup failed — try again" };
  }

  if (role === "admin") redirect("/admin");
  if (role === "station") redirect("/settings");
  redirect(role === "dj" ? "/dashboard" : "/");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}
