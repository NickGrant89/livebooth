import fs from "node:fs";
import { error } from "@/lib/api-utils";
import {
  getRemoteRecordingFileUrl,
  getRecordingsPublicBaseUrls,
  isRemoteRecordingEnabled,
  recordingsContentType,
  resolveRecordingFilePath,
} from "@/lib/vod-recording";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  if (!parts?.length) return error("Not found", 404);

  const name = parts[parts.length - 1] ?? "recording.mp4";
  const relativePath = parts.join("/");

  const filePath = resolveRecordingFilePath(parts);
  if (filePath) {
    const stat = fs.statSync(filePath);
    const data = fs.readFileSync(filePath);
    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": recordingsContentType(name),
        "Content-Length": String(stat.size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  if (isRemoteRecordingEnabled()) {
    const bases = getRecordingsPublicBaseUrls();

    for (const base of bases) {
      const remoteUrl = getRemoteRecordingFileUrl(relativePath, base);
      if (!remoteUrl) continue;

      try {
        const head = await fetch(remoteUrl, { method: "HEAD", cache: "no-store" });
        if (head.ok) {
          return Response.redirect(remoteUrl, 307);
        }
      } catch {
        // try next base URL
      }
    }
  }

  return error("Not found", 404);
}
