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
    const range = request.headers.get("range");

    if (range) {
      const match = /^bytes=(\d+)-(\d*)$/i.exec(range);
      if (match) {
        const start = parseInt(match[1]!, 10);
        const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
        const chunk = fs.readFileSync(filePath).subarray(start, end + 1);
        return new Response(chunk, {
          status: 206,
          headers: {
            "Content-Type": recordingsContentType(name),
            "Content-Length": String(chunk.length),
            "Content-Range": `bytes ${start}-${end}/${stat.size}`,
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    }

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
    const range = request.headers.get("range");
    const bases = getRecordingsPublicBaseUrls();

    for (const base of bases) {
      const remoteUrl = getRemoteRecordingFileUrl(relativePath, base);
      if (!remoteUrl) continue;

      try {
        const res = await fetch(remoteUrl, {
          headers: range ? { Range: range } : {},
          cache: "no-store",
        });
        if (!res.ok && res.status !== 206) continue;

        const headers = new Headers();
        headers.set("Content-Type", res.headers.get("content-type") ?? recordingsContentType(name));
        headers.set("Accept-Ranges", "bytes");
        headers.set("Cache-Control", "public, max-age=86400");
        const contentLength = res.headers.get("content-length");
        const contentRange = res.headers.get("content-range");
        if (contentLength) headers.set("Content-Length", contentLength);
        if (contentRange) headers.set("Content-Range", contentRange);

        return new Response(res.body, {
          status: res.status,
          headers,
        });
      } catch {
        // try next base URL
      }
    }
  }

  return error("Not found", 404);
}
