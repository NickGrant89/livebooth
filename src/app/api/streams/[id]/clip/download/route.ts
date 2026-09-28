import fs from "node:fs";
import { prisma } from "@/lib/db";
import { error, isApiError, requireApiUser } from "@/lib/api-utils";
import {
  fetchRemoteClip,
  resolveLocalClipFile,
  verifyClipDownloadToken,
} from "@/lib/recording-clip";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { id } = await params;
  const url = new URL(request.url);
  const relativePath = url.searchParams.get("path") ?? "";
  const token = url.searchParams.get("token") ?? "";

  if (!relativePath || !token || !verifyClipDownloadToken(id, relativePath, token)) {
    return error("Invalid or expired download link", 403);
  }

  const stream = await prisma.stream.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!stream) return error("Not found", 404);

  const filename = relativePath.split("/").pop() ?? "livebooth-clip.mp4";
  const safeTitle = stream.title.replace(/[^\w\s-]/g, "").trim().slice(0, 40) || "clip";
  const downloadName = `livebooth-${safeTitle}-${filename}`;

  const local = resolveLocalClipFile(relativePath);
  if (local) {
    const data = fs.readFileSync(local);
    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${downloadName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const remote = await fetchRemoteClip(relativePath);
  if (!remote) return error("Clip file not found", 404);

  const headers = new Headers(remote.headers);
  headers.set("Content-Type", "video/mp4");
  headers.set("Content-Disposition", `attachment; filename="${downloadName.replace(/"/g, "")}"`);
  headers.set("Cache-Control", "private, no-store");

  return new Response(remote.body, { status: remote.status, headers });
}
