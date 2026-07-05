import { prisma } from "@/lib/db";
import { json, error, isApiError } from "@/lib/api-utils";
import { requireAdminApi, logAdminAction } from "@/lib/admin";
import {
  generateTotpSecret,
  getTotpUri,
  verifyTotpCode,
  getAdminTotpStatus,
} from "@/lib/admin-totp";
import { z } from "zod";

export async function GET(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  const status = await getAdminTotpStatus(admin.id);
  return json(status);
}

const codeSchema = z.object({ code: z.string().min(6).max(8) });

export async function POST(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === "setup") {
      const secret = generateTotpSecret();
      await prisma.user.update({
        where: { id: admin.id },
        data: { totpSecret: secret, totpEnabled: false },
      });
      return json({
        secret,
        uri: getTotpUri(admin.email, secret),
      });
    }

    if (action === "enable") {
      const { code } = codeSchema.parse(body);
      const user = await prisma.user.findUnique({
        where: { id: admin.id },
        select: { totpSecret: true },
      });
      if (!user?.totpSecret) return error("Run setup first", 400);
      if (!verifyTotpCode(user.totpSecret, code)) return error("Invalid code", 400);

      await prisma.user.update({
        where: { id: admin.id },
        data: { totpEnabled: true },
      });
      await logAdminAction(admin.id, "totp_enable", admin.id, {}, request);
      return json({ enabled: true });
    }

    if (action === "disable") {
      const { code } = codeSchema.parse(body);
      const user = await prisma.user.findUnique({
        where: { id: admin.id },
        select: { totpSecret: true, totpEnabled: true },
      });
      if (!user?.totpSecret || !user.totpEnabled) return error("2FA not enabled", 400);
      if (!verifyTotpCode(user.totpSecret, code)) return error("Invalid code", 400);

      await prisma.user.update({
        where: { id: admin.id },
        data: { totpEnabled: false, totpSecret: null },
      });
      await logAdminAction(admin.id, "totp_disable", admin.id, {}, request);
      return json({ enabled: false });
    }

    return error("Unknown action", 400);
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid code");
    return error("2FA action failed", 500);
  }
}
