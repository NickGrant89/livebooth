import "server-only";

/** Best-effort nudge to the VPS remux service when a stream ends (optional env). */
export async function scheduleRecordingRemux(ingestKey: string | null | undefined): Promise<void> {
  if (!ingestKey) return;
  const url = process.env.RECORDINGS_REMUX_URL;
  if (!url) return;

  const secret = process.env.RECORDINGS_REMUX_SECRET ?? "";
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({ ingestKey }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // Watcher + MediaMTX hook are the primary path; this is a backup nudge only.
  }
}
