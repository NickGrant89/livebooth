import { getAuthUserForClient } from "@/lib/session-user";
import { json } from "@/lib/api-utils";

export async function GET() {
  const user = await getAuthUserForClient();
  return json({ user });
}
