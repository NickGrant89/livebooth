import fs from "node:fs";
import { error } from "@/lib/api-utils";
import {
  recordingsContentType,
  resolveRecordingFilePath,
} from "@/lib/vod-recording";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  if (!parts?.length) return error("Not found", 404);

  const filePath = resolveRecordingFilePath(parts);
  if (!filePath) return error("Not found", 404);

  const stat = fs.statSync(filePath);
  const data = fs.readFileSync(filePath);
  const name = parts[parts.length - 1] ?? "recording.mp4";

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
