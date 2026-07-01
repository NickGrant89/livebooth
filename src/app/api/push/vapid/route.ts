import { json } from "@/lib/api-utils";
import { getVapidPublicKey, isPushConfigured } from "@/lib/web-push";

export async function GET() {
  return json({
    configured: isPushConfigured(),
    publicKey: getVapidPublicKey(),
  });
}
