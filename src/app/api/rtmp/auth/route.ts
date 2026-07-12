import { validateRtmpPublish, type MediaMtxAuthPayload } from "@/lib/rtmp-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

/** MediaMTX HTTP auth — POST with JSON body; 20x = allow, else deny. */
export async function POST(request: Request) {
  let payload: MediaMtxAuthPayload = {};
  try {
    payload = (await request.json()) as MediaMtxAuthPayload;
  } catch {
    return new Response("bad request", { status: 400 });
  }

  if (payload.action === "publish") {
    console.info("[rtmp-auth] publish", JSON.stringify(payload));
  }

  let ok = false;
  try {
    ok = await validateRtmpPublish(payload);
  } catch (err) {
    console.error("[rtmp-auth] error", err, JSON.stringify(payload));
    return new Response("error", { status: 500 });
  }

  if (!ok) {
    console.warn("[rtmp-auth] denied", JSON.stringify(payload));
  }
  return new Response(ok ? "ok" : "forbidden", { status: ok ? 200 : 403 });
}
