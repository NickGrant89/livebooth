import { generateSecret, generateURI, verifySync } from "otplib";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "livebooth-dev-secret-change-in-production",
);

export function generateTotpSecret() {
  return generateSecret();
}

export function getTotpUri(email: string, secret: string) {
  return generateURI({
    issuer: "LiveBooth",
    label: email,
    secret,
  });
}

export function verifyTotpCode(secret: string, code: string) {
  const result = verifySync({ secret, token: code.replace(/\s/g, "") });
  return result.valid === true;
}

export async function createTotpPendingToken(userId: string) {
  return new SignJWT({ sub: userId, purpose: "totp_pending" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .sign(SECRET);
}

export async function verifyTotpPendingToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.purpose !== "totp_pending") return null;
    return payload.sub as string;
  } catch {
    return null;
  }
}

export async function getAdminTotpStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpEnabled: true, role: true },
  });
  if (!user || user.role !== "admin") return { enabled: false, configured: false };
  return { enabled: user.totpEnabled, configured: user.totpEnabled };
}
