import { json, error, isApiError } from "@/lib/api-utils";
import { requireAdminApi, logAdminAction } from "@/lib/admin";
import {
  getPlatformSettings,
  savePlatformSettings,
  type PlatformSettings,
} from "@/lib/platform-settings";
import { z } from "zod";

export async function GET(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  const settings = await getPlatformSettings();
  return json({ settings });
}

const patchSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().max(500).optional(),
  welcomeBonus: z.number().min(0).max(100000).optional(),
  signupEnabled: z.boolean().optional(),
  betaBannerEnabled: z.boolean().optional(),
  supportEmailAlerts: z.boolean().optional(),
  inStreamAdEnabled: z.boolean().optional(),
  inStreamAdLabel: z.string().max(120).optional(),
  inStreamAdUrl: z.string().max(500).optional(),
});

export async function PATCH(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  try {
    const body = patchSchema.parse(await request.json());
    const settings = await savePlatformSettings(body as Partial<PlatformSettings>);
    await logAdminAction(admin.id, "platform_settings", "platform_settings", body, request);
    return json({ settings });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid settings");
    return error("Update failed", 500);
  }
}
