import {
  AI_MODERATION_RISK_FLAG,
  AI_MODERATION_RISK_STOP,
  AI_MODERATION_SCAN_INTERVAL_MS,
} from "./constants";
import { prisma } from "./db";
import { forceEndStream } from "./moderation";
import { fetchLiveSnapshot } from "./recording-clip";
import { isDemoPlayback, isLiveBoothIngestKey } from "./streaming";

export type ModerationProvider = "mock" | "hive" | "rekognition";

export interface AiScanResult {
  provider: ModerationProvider;
  riskScore: number;
  flags: string[];
  action: "pass" | "flag" | "stop";
  mediaUrl?: string;
}

function getConfiguredProvider(): ModerationProvider {
  const explicit = process.env.MODERATION_PROVIDER as ModerationProvider | undefined;
  if (explicit === "hive" || explicit === "rekognition" || explicit === "mock") {
    return explicit;
  }
  if (process.env.HIVE_API_KEY) return "hive";
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) return "rekognition";
  return "mock";
}

export function isAiModerationConfigured() {
  const p = getConfiguredProvider();
  return p !== "mock" || process.env.MODERATION_PROVIDER === "mock";
}

export function getAiModerationProvider() {
  return getConfiguredProvider();
}

/** Derive a scannable image URL from HLS playback (Livepeer thumbnail). */
export function getModerationMediaUrl(playbackUrl: string | null | undefined): string | null {
  if (!playbackUrl || isDemoPlayback(playbackUrl)) return null;

  const livepeer = playbackUrl.match(/livepeercdn\.studio\/hls\/([^/]+)/);
  if (livepeer) {
    return `https://livepeercdn.studio/hls/${livepeer[1]}/thumbnail.jpg`;
  }

  if (playbackUrl.includes(".m3u8")) {
    return playbackUrl.replace(/index\.m3u8$/, "thumbnail.jpg");
  }

  if (/\.(jpg|jpeg|png|webp)(\?|$)/i.test(playbackUrl)) {
    return playbackUrl;
  }

  return playbackUrl;
}

async function fetchImageBytes(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

/** Hive also returns high scores for "safe", "natural", and "no nudity". Those are not violations. */
function hiveClassIsClear(name: string): boolean {
  const n = name.toLowerCase();
  if (n.startsWith("no_") || n.startsWith("not_")) return true;
  if (n.includes("_not_") || n.includes("not_nsfw") || n.includes("not_suggestive")) return true;
  if (n === "natural" || n === "animated" || n === "hybrid" || n === "yes_overlay_text") return true;
  return false;
}

async function scanWithHive(mediaUrl: string, jpeg?: Buffer): Promise<AiScanResult> {
  const apiKey = process.env.HIVE_API_KEY;
  if (!apiKey) throw new Error("HIVE_API_KEY not set");

  const form = new FormData();
  if (jpeg) {
    form.append("media", new Blob([new Uint8Array(jpeg)], { type: "image/jpeg" }), "frame.jpg");
  } else {
    form.append("url", mediaUrl);
  }

  const res = await fetch("https://api.thehive.ai/api/v2/task/sync", {
    method: "POST",
    headers: { Authorization: `Token ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Hive API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    status?: Array<{ response?: { output?: Array<{ classes?: Array<{ class: string; score: number }> }> } }>;
  };

  const classes =
    data.status?.[0]?.response?.output?.flatMap((o) => o.classes ?? []) ?? [];
  const violations = classes.filter((c) => !hiveClassIsClear(c.class));

  const flags = violations
    .filter((c) => c.score >= 0.4)
    .map((c) => `${c.class} (${Math.round(c.score * 100)}%)`);

  const riskScore =
    violations.length > 0 ? Math.max(...violations.map((c) => c.score)) : 0;

  return buildResult("hive", riskScore, flags, mediaUrl);
}

async function scanWithRekognition(mediaUrl: string, jpeg?: Buffer): Promise<AiScanResult> {
  const bytes = jpeg ?? (await fetchImageBytes(mediaUrl));
  if (!bytes) {
    return buildResult("rekognition", 0, ["no_frame"], mediaUrl);
  }

  const { RekognitionClient, DetectModerationLabelsCommand } = await import(
    "@aws-sdk/client-rekognition"
  );

  const client = new RekognitionClient({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const out = await client.send(
    new DetectModerationLabelsCommand({
      Image: { Bytes: bytes },
      MinConfidence: 40,
    }),
  );

  const labels = out.ModerationLabels ?? [];
  const flags = labels.map(
    (l) => `${l.Name ?? "unknown"} (${Math.round(l.Confidence ?? 0)}%)`,
  );
  const riskScore =
    labels.length > 0
      ? Math.max(...labels.map((l) => (l.Confidence ?? 0) / 100))
      : 0;

  return buildResult("rekognition", riskScore, flags, mediaUrl);
}

function scanBuiltIn(mediaUrl: string, blackPercent: number | null): AiScanResult {
  if (blackPercent != null && blackPercent >= 98) {
    return buildResult("mock", 0.6, [`mostly_black (${Math.round(blackPercent)}%)`], mediaUrl);
  }
  const flags = ["picture_ok"];
  if (blackPercent != null) flags.push(`black ${Math.round(blackPercent)}%`);
  return buildResult("mock", 0.05, flags, mediaUrl);
}

function buildResult(
  provider: ModerationProvider,
  riskScore: number,
  flags: string[],
  mediaUrl?: string,
): AiScanResult {
  let action: AiScanResult["action"] = "pass";
  if (riskScore >= AI_MODERATION_RISK_STOP) action = "stop";
  else if (riskScore >= AI_MODERATION_RISK_FLAG) action = "flag";

  return { provider, riskScore, flags, action, mediaUrl };
}

export async function runAiModerationScan(streamId: string): Promise<AiScanResult | null> {
  const stream = await prisma.stream.findUnique({ where: { id: streamId } });
  if (!stream || stream.status !== "live") return null;

  const mediaUrl = getModerationMediaUrl(stream.playbackUrl);
  if (!mediaUrl && !isLiveBoothIngestKey(stream.ingestKey)) return null;

  const snapshotOn = Boolean(process.env.RECORDINGS_CLIP_URL && process.env.RECORDINGS_CLIP_SECRET);
  const ingestKey = stream.ingestKey ?? "";
  const frame =
    snapshotOn && isLiveBoothIngestKey(ingestKey)
      ? await fetchLiveSnapshot(ingestKey).catch(() => null)
      : null;
  const scanUrl = mediaUrl ?? stream.playbackUrl ?? ingestKey;

  const provider = getConfiguredProvider();
  let result: AiScanResult;

  try {
    if (snapshotOn && isLiveBoothIngestKey(ingestKey) && !frame) {
      result = buildResult(provider, 0.6, ["no_picture"], scanUrl);
    } else if (frame && provider === "mock") {
      result = scanBuiltIn(scanUrl, frame.blackPercent);
    } else {
      switch (provider) {
        case "hive":
          result = await scanWithHive(scanUrl, frame?.jpeg);
          break;
        case "rekognition":
          result = await scanWithRekognition(scanUrl, frame?.jpeg);
          break;
        default:
          result = buildResult("mock", 0.05, ["no_frame_source"], scanUrl);
      }
    }
  } catch (err) {
    console.error(`AI moderation scan failed (${provider}):`, err);
    result = buildResult(provider, 0, ["scan_error"], scanUrl);
  }

  await prisma.streamAiScan.create({
    data: {
      streamId,
      provider: result.provider,
      riskScore: result.riskScore,
      flags: JSON.stringify(result.flags),
      action: result.action,
      mediaUrl: result.mediaUrl,
    },
  });

  await prisma.stream.update({
    where: { id: streamId },
    data: {
      aiRiskScore: result.riskScore,
      aiLastScanAt: new Date(),
      moderationStatus:
        result.action === "stop" || result.action === "flag"
          ? "flagged"
          : stream.moderationStatus,
    },
  });

  if (result.action === "stop") {
    await forceEndStream(
      streamId,
      `AI moderation (${result.provider}): ${result.flags.slice(0, 3).join(", ") || "policy violation"}`,
      "auto_stopped",
    );
  }

  return result;
}

export async function scanLiveStreamsDue(opts?: { force?: boolean }) {
  const cutoff = new Date(Date.now() - AI_MODERATION_SCAN_INTERVAL_MS);
  const live = await prisma.stream.findMany({
    where: {
      status: "live",
      ...(opts?.force
        ? {}
        : { OR: [{ aiLastScanAt: null }, { aiLastScanAt: { lt: cutoff } }] }),
    },
    select: { id: true },
  });

  const results: AiScanResult[] = [];
  for (const s of live) {
    const r = await runAiModerationScan(s.id);
    if (r) results.push(r);
  }
  return results;
}

export async function getRecentAiScans(limit = 20) {
  return prisma.streamAiScan.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      stream: {
        select: {
          title: true,
          status: true,
          dj: { select: { username: true, displayName: true } },
        },
      },
    },
  });
}
