import { tryStopObsStreaming } from "@/lib/obs-websocket";

export async function endStreamWithObsSync(
  endApi: () => Promise<Response>,
): Promise<{ res: Response; obsStopped: boolean }> {
  const res = await endApi();
  let obsStopped = false;
  if (res.ok) {
    obsStopped = await tryStopObsStreaming();
  }
  return { res, obsStopped };
}
