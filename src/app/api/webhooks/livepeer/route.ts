import { json, error } from "@/lib/api-utils";
import { applyLivepeerRecording } from "@/lib/livepeer-webhook";

const RECORDING_EVENTS = new Set([
  "stream.idle",
  "recording.ready",
  "playback.recording.ready",
]);

export async function POST(request: Request) {
  const secret = process.env.LIVEPEER_WEBHOOK_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}` && auth !== secret) {
      return error("Unauthorized", 401);
    }
  }

  let payload: Parameters<typeof applyLivepeerRecording>[0];
  try {
    payload = await request.json();
  } catch {
    return error("Invalid JSON", 400);
  }

  const event = payload.event ?? "";
  if (!RECORDING_EVENTS.has(event)) {
    return json({ ok: true, ignored: true, event });
  }

  const result = await applyLivepeerRecording(payload);
  return json({ ok: true, ...result });
}
