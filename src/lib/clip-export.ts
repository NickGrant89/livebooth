/** Client-side 9:16 clip export from a VOD video element. */

const CLIP_WIDTH = 540;
const CLIP_HEIGHT = 960;

function waitForSeek(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    if (video.readyState >= 2) {
      resolve();
      return;
    }
    video.addEventListener("seeked", () => resolve(), { once: true });
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function pickMimeType() {
  const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm";
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  watermark: string,
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  const targetAspect = 9 / 16;
  const videoAspect = vw / vh;
  let sx: number;
  let sy: number;
  let sw: number;
  let sh: number;

  if (videoAspect > targetAspect) {
    sh = vh;
    sw = vh * targetAspect;
    sx = (vw - sw) / 2;
    sy = 0;
  } else {
    sw = vw;
    sh = vw / targetAspect;
    sx = 0;
    sy = (vh - sh) / 2;
  }

  ctx.fillStyle = "#030304";
  ctx.fillRect(0, 0, CLIP_WIDTH, CLIP_HEIGHT);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, CLIP_WIDTH, CLIP_HEIGHT);

  const barH = 48;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, CLIP_HEIGHT - barH, CLIP_WIDTH, barH);
  ctx.fillStyle = "#53fc18";
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.fillText("LiveBooth", 14, CLIP_HEIGHT - 18);
  ctx.fillStyle = "#e4e4e7";
  ctx.font = "12px system-ui, sans-serif";
  const label = watermark.slice(0, 36);
  ctx.fillText(label, 100, CLIP_HEIGHT - 18);
}

export async function exportVerticalClip(
  video: HTMLVideoElement,
  startSec: number,
  durationSec: number,
  watermark: string,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Clip export is not supported in this browser.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = CLIP_WIDTH;
  canvas.height = CLIP_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context.");

  video.pause();
  video.currentTime = Math.max(0, startSec);
  await waitForSeek(video);
  await sleep(150);

  const canvasStream = canvas.captureStream(30);
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(canvasStream, {
    mimeType,
    videoBitsPerSecond: 2_500_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = () => reject(new Error("Recording failed"));
  });

  let running = true;
  const startedAt = performance.now();
  const totalMs = durationSec * 1000;

  const drawLoop = () => {
    if (!running) return;
    drawFrame(ctx, video, watermark);
    const elapsed = performance.now() - startedAt;
    onProgress?.(Math.min(100, Math.round((elapsed / totalMs) * 100)));
    if (elapsed < totalMs) {
      requestAnimationFrame(drawLoop);
    }
  };

  recorder.start(200);
  drawLoop();
  await video.play().catch(() => undefined);

  await sleep(totalMs);
  running = false;
  video.pause();
  recorder.stop();

  return stopped;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatClipTimestamp(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
