import { validateRtmpPublish, type MediaMtxAuthPayload } from "@/lib/rtmp-auth";

/** MediaMTX HTTP auth — POST with JSON body; 20x = allow, else deny. */
export async function POST(request: Request) {
  let payload: MediaMtxAuthPayload = {};
  try {
    payload = (await request.json()) as MediaMtxAuthPayload;
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const ok = await validateRtmpPublish(payload);
  return new Response(ok ? "ok" : "forbidden", { status: ok ? 200 : 403 });
}
