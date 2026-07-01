"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { getDismissKey } from "@/lib/guidance";

const ALL_GUIDE_KEYS = [
  "lb_dismiss_guide_fan",
  "lb_dismiss_guide_dj",
  "lb_dismiss_guide_station",
  "lb_dismiss_stream_tips",
  "lb_dismiss_dj_live_checklist",
  "lb_dismiss_dj_setup",
  "lb_dismiss_settings_fan",
  "lb_dismiss_settings_dj",
  "lb_dismiss_settings_station",
  "lb_dismiss_wallet_guide",
  "lb_dismiss_help_quick_fan",
  "lb_dismiss_help_quick_dj",
  "lb_dismiss_help_quick_station",
];

export function ResetGuidesButton({ role }: { role: string }) {
  const [done, setDone] = useState(false);

  function reset() {
    ALL_GUIDE_KEYS.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(getDismissKey(role));
    setDone(true);
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={reset}
      className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300"
    >
      <RotateCcw className="h-3 w-3" />
      {done ? "Guides restored" : "Show in-app guides again"}
    </button>
  );
}
