import { json } from "@/lib/api-utils";

/** Is the RTMP/HLS stack reachable? (dev: local MediaMTX API; prod: public HLS host) */
export async function GET() {
  const local =
    Boolean(process.env.RTMP_SERVER_URL && process.env.HLS_SERVER_URL) &&
    !process.env.LIVEPEER_API_KEY;

  if (!local) {
    return json({ mode: "cloud-or-demo" as const, reachable: null });
  }

  const hls = process.env.HLS_SERVER_URL?.replace(/\/$/, "");

  if (hls && !hls.includes("127.0.0.1") && !hls.includes("localhost")) {
    try {
      const res = await fetch(hls, {
        signal: AbortSignal.timeout(4000),
        cache: "no-store",
      });
      return json({ mode: "local" as const, reachable: res.ok || res.status === 404 });
    } catch {
      return json({ mode: "local" as const, reachable: false });
    }
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
