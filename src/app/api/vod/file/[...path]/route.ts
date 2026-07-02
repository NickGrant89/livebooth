import fs from "node:fs";
import { error } from "@/lib/api-utils";
import {
  getRemoteRecordingFileUrl,
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
    const remoteUrl = getRemoteRecordingFileUrl(relativePath);
    if (!remoteUrl) return error("Not found", 404);

    const range = request.headers.get("range");
    const remoteRes = await fetch(remoteUrl, {
      cache: "no-store",
      headers: range ? { Range: range } : undefined,
    });

    if (remoteRes.ok || remoteRes.status === 206) {
      const headers = new Headers();
      headers.set(
        "Content-Type",
        remoteRes.headers.get("Content-Type") ?? recordingsContentType(name),
      );
      const len = remoteRes.headers.get("Content-Length");
      if (len) headers.set("Content-Length", len);
      const contentRange = remoteRes.headers.get("Content-Range");
      if (contentRange) headers.set("Content-Range", contentRange);
      headers.set("Accept-Ranges", "bytes");
      headers.set("Cache-Control", "public, max-age=86400");

      return new Response(remoteRes.body, {
        status: remoteRes.status,
        headers,
      });
    }
  }

  return error("Not found", 404);
}
