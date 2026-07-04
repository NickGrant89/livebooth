"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Share2, Link2, Check, ChevronDown } from "lucide-react";
import {
  type ShareKind,
  getShareContent,
  shareToX,
  shareToWhatsApp,
  shareToTelegram,
  nativeShare,
} from "@/lib/share";

export interface ShareMenuProps {
  kind: ShareKind;
  path: string;
  djName?: string;
  setTitle?: string;
  title?: string;
  tips?: number;
  peak?: number;
  stationName?: string;
  username?: string;
  showCopyText?: boolean;
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}

export function ShareMenu({
  kind,
  path,
  djName,
  setTitle,
  title,
  tips,
  peak,
  stationName,
  username,
  showCopyText = true,
  label = "Share",
  variant = "secondary",
  className = "",
}: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"link" | "text" | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [menuSide, setMenuSide] = useState<"left" | "right">("right");
  const ref = useRef<HTMLDivElement>(null);

  const share = getShareContent(kind, path, {
    djName,
    setTitle,
    title,
    tips,
    peak,
    stationName,
    username,
  });

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const menuWidth = 210;
    const pad = 12;
    const fitsRight = rect.left + menuWidth <= window.innerWidth - pad;
    const fitsLeft = rect.right - menuWidth >= pad;

    if (!fitsRight && fitsLeft) setMenuSide("right");
    else if (fitsRight && !fitsLeft) setMenuSide("left");
    else setMenuSide(rect.left + rect.width / 2 > window.innerWidth / 2 ? "right" : "left");
  }, [open]);

  async function copyLink() {
    await navigator.clipboard.writeText(share.url);
    setCopied("link");
    setTimeout(() => setCopied(null), 2000);
  }

  async function copyText() {
    await navigator.clipboard.writeText(share.text);
    setCopied("text");
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleNativeShare() {
    const ok = await nativeShare(share.title, share.text, share.url);
    if (!ok) await copyLink();
    setOpen(false);
  }

  const btnClass =
    variant === "primary"
      ? "btn-primary rounded-xl px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 w-full sm:w-auto"
      : variant === "ghost"
        ? "text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-white/5 flex items-center gap-1.5 text-sm"
        : "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/10 flex items-center gap-2 w-full sm:w-auto";

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className={btnClass}>
        <Share2 className="h-4 w-4 shrink-0" />
        {label}
        <ChevronDown className={`h-3.5 w-3.5 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={`absolute top-full mt-2 z-50 min-w-[210px] max-w-[calc(100vw-1.5rem)] rounded-xl border border-white/10 bg-[#141416] py-1 shadow-xl ${
            menuSide === "right" ? "right-0 left-auto" : "left-0 right-auto"
          }`}
        >
          {canNativeShare && (
            <MenuRow label="Share…" onClick={() => { void handleNativeShare(); }} />
          )}
          <MenuRow
            label={copied === "link" ? "Link copied!" : "Copy link"}
            icon={copied === "link" ? <Check className="h-3.5 w-3.5 text-[#53fc18]" /> : <Link2 className="h-3.5 w-3.5 text-zinc-500" />}
            onClick={() => { void copyLink(); }}
          />
          <MenuRow label="Share on X" onClick={() => { shareToX(share.text, share.url); setOpen(false); }} />
          <MenuRow label="WhatsApp" onClick={() => { shareToWhatsApp(share.text, share.url); setOpen(false); }} />
          <MenuRow label="Telegram" onClick={() => { shareToTelegram(share.text, share.url); setOpen(false); }} />
          {showCopyText && (
            <MenuRow
              label={copied === "text" ? "Text copied!" : "Copy share text"}
              icon={copied === "text" ? <Check className="h-3.5 w-3.5 text-[#53fc18]" /> : undefined}
              onClick={() => { void copyText(); }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MenuRow({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
      onClick={onClick}
    >
      {icon ?? <span className="w-3.5" />}
      {label}
    </button>
  );
}
