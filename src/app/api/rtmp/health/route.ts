import { json } from "@/lib/api-utils";

/** Dev helper — is local MediaMTX running? */
export async function GET() {
  const local =
    Boolean(process.env.RTMP_SERVER_URL && process.env.HLS_SERVER_URL) &&
    !process.env.LIVEPEER_API_KEY;

  if (!local) {
    return json({ mode: "cloud-or-demo" as const, reachable: null });
  }

  try {
    const res = await fetch("http://127.0.0.1:9997/v3/config/global/get", {
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });
    return json({ mode: "local" as const, reachable: res.ok });
  } catch {
    return json({ mode: "local" as const, reachable: false });
  }
}
