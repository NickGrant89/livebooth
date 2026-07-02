/** CORS helpers for canvas-based clip export from <video>. */

export function resolvePlaybackUrl(url: string): string {
  if (typeof window === "undefined") return url;
  return url.startsWith("/") ? `${window.location.origin}${url}` : url;
}

/** True when the browser must fetch with CORS for canvas export to work. */
export function playbackNeedsCrossOrigin(url: string): boolean {
  if (!url) return false;
  if (url.includes("/api/vod/file/")) return true;
  if (/\.(mp4|fmp4|webm)(\?|$)/i.test(url)) return true;
  if (typeof window === "undefined") return false;
  try {
    return new URL(resolvePlaybackUrl(url)).origin !== window.location.origin;
  } catch {
    return false;
  }
}

export function isVideoCanvasExportable(video: HTMLVideoElement): boolean {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return false;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  try {
    ctx.drawImage(video, 0, 0, 1, 1);
    ctx.getImageData(0, 0, 1, 1);
    return true;
  } catch {
    return false;
  }
}

async function waitForSeek(video: HTMLVideoElement): Promise<void> {
  if (video.seeking) {
    await new Promise<void>((resolve) => {
      video.addEventListener("seeked", () => resolve(), { once: true });
    });
    return;
  }
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    video.addEventListener("seeked", done, { once: true });
    window.setTimeout(done, 400);
  });
}

/** Reload video with crossOrigin so canvas export works (no full page refresh). */
export async function reloadVideoWithCrossOrigin(
  video: HTMLVideoElement,
  src: string,
): Promise<void> {
  const time = video.currentTime;
  const wasPaused = video.paused;

  video.crossOrigin = "anonymous";
  video.src = src;
  video.load();

  await new Promise<void>((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onFail = () => {
      cleanup();
      reject(new Error("Could not reload replay for clip export."));
    };
    const cleanup = () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onFail);
      window.clearTimeout(timer);
    };
    video.addEventListener("loadeddata", onReady, { once: true });
    video.addEventListener("error", onFail, { once: true });
    const timer = window.setTimeout(onFail, 15000);
  });

  if (Number.isFinite(time) && time > 0) {
    video.currentTime = time;
    await waitForSeek(video);
  }

  if (!wasPaused) {
    await video.play().catch(() => undefined);
  }
}

export async function ensureVideoExportReady(
  video: HTMLVideoElement,
  playbackUrl: string,
): Promise<void> {
  if (!playbackNeedsCrossOrigin(playbackUrl)) return;

  const src = resolvePlaybackUrl(playbackUrl);

  if (video.crossOrigin !== "anonymous") {
    await reloadVideoWithCrossOrigin(video, src);
  } else if (!isVideoCanvasExportable(video)) {
    await reloadVideoWithCrossOrigin(video, src);
  }

  if (!isVideoCanvasExportable(video)) {
    throw new Error(
      "Clip export is blocked — the recording server may be missing CORS headers. Try again in a moment.",
    );
  }
}
