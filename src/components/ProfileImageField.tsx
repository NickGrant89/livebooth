"use client";

import { useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, X } from "lucide-react";

type ProfileImageFieldProps = {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  variant: "avatar" | "banner";
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL("image/jpeg", quality);
}

async function resizeAvatar(file: File): Promise<string> {
  const img = await loadImage(file);
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
  return canvasToJpeg(canvas, 0.88);
}

async function resizeBanner(file: File): Promise<string> {
  const img = await loadImage(file);
  const width = 1600;
  const height = 400;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const targetRatio = width / height;
  const imgRatio = img.width / img.height;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (imgRatio > targetRatio) {
    sw = img.height * targetRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / targetRatio;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
  return canvasToJpeg(canvas, 0.84);
}

export function ProfileImageField({ label, hint, value, onChange, variant }: ProfileImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  const previewClass =
    variant === "avatar"
      ? "h-20 w-20 rounded-2xl border-4 border-[#141416]"
      : "h-28 w-full rounded-xl border border-white/10";

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setLocalError("Choose a JPG, PNG, or WebP image");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setLocalError("Image must be under 8 MB");
      return;
    }

    setBusy(true);
    setLocalError("");
    try {
      const dataUrl = variant === "avatar" ? await resizeAvatar(file) : await resizeBanner(file);
      onChange(dataUrl);
    } catch {
      setLocalError("Could not process image — try another file");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs text-zinc-500">{label}</label>
        <div className="flex gap-1 text-[10px]">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`rounded px-2 py-0.5 ${mode === "upload" ? "bg-white/10 text-white" : "text-zinc-500"}`}
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`rounded px-2 py-0.5 ${mode === "url" ? "bg-white/10 text-white" : "text-zinc-500"}`}
          >
            URL
          </button>
        </div>
      </div>

      <div className={variant === "banner" ? "space-y-3" : "flex items-start gap-4"}>
        <div
          className={`relative overflow-hidden bg-gradient-to-br from-[#53fc18]/30 to-[#00d4aa]/20 shrink-0 ${previewClass}`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-500">
              <ImagePlus className="h-6 w-6" />
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          {mode === "upload" ? (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 disabled:opacity-50"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                {variant === "avatar" ? "Choose profile photo" : "Choose banner image"}
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                <input
                  value={value.startsWith("data:") ? "" : value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-lg bg-white/5 border border-white/10 pl-9 pr-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          )}

          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-red-300"
            >
              <X className="h-3 w-3" />
              Remove {variant === "avatar" ? "photo" : "banner"}
            </button>
          )}

          <p className="text-[10px] text-zinc-600">{hint}</p>
          {localError && <p className="text-[11px] text-red-400">{localError}</p>}
        </div>
      </div>
    </div>
  );
}
