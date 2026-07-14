"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { MEMBER_TIER_PRICES } from "@/lib/constants";

/** Legacy VIP button → directs fans to monthly membership */
export function SubscribeButton({ djUsername }: { djUsername: string }) {
  return (
    <Link
      href={`/dj/${djUsername}#membership`}
      className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl bg-[#53fc18]/15 border border-[#53fc18]/30 px-3 sm:px-4 py-2 text-sm font-semibold text-[#53fc18] hover:bg-[#53fc18]/25 transition-colors min-w-0"
    >
      <Users className="h-4 w-4 shrink-0" />
      <span className="truncate">
        <span className="sm:hidden">Member</span>
        <span className="hidden sm:inline">Member · from {MEMBER_TIER_PRICES.member} DROP/mo</span>
      </span>
    </Link>
  );
}
