"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, BookOpen, ChevronRight } from "lucide-react";
import type { GuidanceStep } from "@/lib/guidance";
import { getDismissKey, getGuidePath } from "@/lib/guidance";

interface GuidanceCardProps {
  title: string;
  subtitle?: string;
  steps: GuidanceStep[];
  role: string;
  dismissKey?: string;
  compact?: boolean;
  variant?: "fan" | "dj" | "neutral";
}

const accent = {
  fan: "border-purple-500/25 bg-purple-500/5 text-purple-300",
  dj: "border-[#53fc18]/25 bg-[#53fc18]/5 text-[#53fc18]",
  neutral: "border-white/10 bg-white/[0.02] text-zinc-300",
};

export function GuidanceCard({
  title,
  subtitle,
  steps,
  role,
  dismissKey,
  compact = false,
  variant = "neutral",
}: GuidanceCardProps) {
  const key = dismissKey ?? getDismissKey(role);
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    setVisible(localStorage.getItem(key) !== "1");
  }, [key]);

  if (visible !== true) return null;

  function dismiss() {
    localStorage.setItem(key, "1");
    setVisible(false);
  }

  return (
    <div className={`rounded-xl border p-4 ${accent[variant]}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4 shrink-0" />
            {title}
          </h3>
          {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-zinc-500 hover:text-white p-1 shrink-0"
          aria-label="Dismiss guide"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ol className={compact ? "space-y-2" : "space-y-3"}>
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-3 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/30 text-xs font-bold text-white">
              {i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="font-medium text-zinc-200">{step.title}</p>
              {!compact && (
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{step.body}</p>
              )}
              {step.href && (
                <Link
                  href={step.href}
                  className="inline-flex items-center gap-0.5 text-xs text-[#53fc18] hover:underline mt-1"
                >
                  {step.hrefLabel ?? "Learn more"}
                  <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>

      <Link
        href={getGuidePath(role)}
        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white mt-4"
      >
        Full guide
        <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
