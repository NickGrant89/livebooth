import fs from "node:fs";
import { error } from "@/lib/api-utils";
import {
  getRemoteRecordingFileUrl,
  getRecordingsPublicBaseUrls,
  isRemoteRecordingEnabled,
  recordingsContentType,
  resolveRecordingFilePath,
} from "@/lib/vod-recording";

export const dynamic = "force-dynamic";

function vodHeaders(name: string, extra?: Record<string, string>): Record<string, string> {
  return {
    "Content-Type": recordingsContentType(name),
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
    Vary: "Range",
    ...extra,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  if (!parts?.length) return error("Not found", 404);

  const name = parts[parts.length - 1] ?? "recording.mp4";
  const relativePath = parts.join("/");
  const range = request.headers.get("range");

  const filePath = resolveRecordingFilePath(parts);
  if (filePath) {
    const stat = fs.statSync(filePath);

    if (range) {
      const match = /^bytes=(\d+)-(\d*)$/i.exec(range);
      if (match) {
        const start = parseInt(match[1]!, 10);
        const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
        const length = end - start + 1;
        const buffer = Buffer.alloc(length);
        const fd = fs.openSync(filePath, "r");
        fs.readSync(fd, buffer, 0, length, start);
        fs.closeSync(fd);
        return new Response(buffer, {
          status: 206,
          headers: vodHeaders(name, {
            "Content-Length": String(length),
            "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          }),
        });
      }
    }

    const data = fs.readFileSync(filePath);
    return new Response(data, {
      status: 200,
      headers: vodHeaders(name, {
        "Content-Length": String(stat.size),
      }),
    });
  }

  if (isRemoteRecordingEnabled()) {
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

        const contentLength = res.headers.get("content-length");
        const contentRange = res.headers.get("content-range");
        const status =
          range && contentRange ? 206 : res.status === 206 ? 206 : res.status;

        const headers = vodHeaders(name);
        if (contentLength) headers["Content-Length"] = contentLength;
        if (contentRange) headers["Content-Range"] = contentRange;

        return new Response(res.body, { status, headers });
      } catch {
        // try next base URL
      }
    }
  }

  return error("Not found", 404);
}
