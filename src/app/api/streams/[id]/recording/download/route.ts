import fs from "node:fs";
import { prisma } from "@/lib/db";
import { error, requireApiUser, isApiError } from "@/lib/api-utils";
import {
  getRemoteRecordingFileUrl,
  getRecordingsPublicBaseUrls,
  isRemoteRecordingEnabled,
  recordingsContentType,
  resolveRecordingDownloadRelativePath,
  resolveRecordingFilePath,
  suggestedRecordingDownloadFilename,
} from "@/lib/vod-recording";

export const dynamic = "force-dynamic";

function downloadHeaders(filename: string, extra?: Record<string, string>): Record<string, string> {
  const safe = filename.replace(/[^\w.\-() ]/g, "_");
  return {
    "Content-Type": recordingsContentType(filename),
    "Content-Disposition": `attachment; filename="${safe}"`,
    "Cache-Control": "private, no-store",
    "Access-Control-Allow-Origin": "*",
    ...extra,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const stream = await prisma.stream.findUnique({
    where: { id },
    select: { id: true, djId: true, status: true, title: true, ingestKey: true },
  });
  if (!stream) return error("Not found", 404);

  const isOwner = stream.djId === auth.id;
  const isAdmin = auth.role === "admin";
  if (!isOwner && !isAdmin) return error("Only the DJ can download this recording", 403);
  if (stream.status !== "ended") return error("Recording is available after you end the stream", 400);

  const relativePath = await resolveRecordingDownloadRelativePath(stream.ingestKey);
  if (!relativePath) return error("Recording not ready yet — try again in a few minutes", 404);

  const parts = relativePath.split("/");
  const recordingFilename = parts[parts.length - 1] ?? "recording.mp4";
  const filename = suggestedRecordingDownloadFilename(stream.title, recordingFilename);
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
          headers: downloadHeaders(filename, {
            "Accept-Ranges": "bytes",
            "Content-Length": String(length),
            "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          }),
        });
      }
    }

    const data = fs.readFileSync(filePath);
    return new Response(data, {
      status: 200,
      headers: downloadHeaders(filename, {
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

        const headers = downloadHeaders(filename);
        if (contentLength) headers["Content-Length"] = contentLength;
        if (contentRange) headers["Content-Range"] = contentRange;
        if (range) headers["Accept-Ranges"] = "bytes";

        return new Response(res.body, { status, headers });
      } catch {
        // try next base URL
      }
    }
  }

  return error("Recording file not found", 404);
}
