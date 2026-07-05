import { json } from "@/lib/api-utils";
import { getPlatformSettings } from "@/lib/platform-settings";

/** Public platform status for maintenance mode checks. */
export async function GET() {
  const settings = await getPlatformSettings();
  return json({
    maintenanceMode: settings.maintenanceMode,
    maintenanceMessage: settings.maintenanceMessage,
    signupEnabled: settings.signupEnabled,
    betaBannerEnabled: settings.betaBannerEnabled,
  });
}
