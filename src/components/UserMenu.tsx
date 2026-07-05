"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ChevronDown,
  HelpCircle,
  LogOut,
  Settings,
  UserCircle,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import type { AuthUser } from "@/context/AuthContext";
import { ProfileAvatar } from "@/components/ProfileAvatar";

export function UserMenu({ user }: { user: AuthUser }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isDj = user.role === "dj" || user.role === "admin";
  const isStation = user.role === "station";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 p-1 sm:pl-1.5 sm:pr-2 sm:py-1.5 hover:bg-white/10 shrink-0"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <ProfileAvatar
          displayName={user.displayName}
          avatar={user.avatar}
          avatarUrl={user.avatarUrl}
          size="xs"
        />
        <span className="text-sm font-medium hidden md:block max-w-[72px] truncate">
          {user.displayName}
        </span>
        <ChevronDown
          className={`hidden md:block h-3.5 w-3.5 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-52 rounded-xl border border-white/10 bg-[#121214] py-1.5 shadow-xl shadow-black/40"
        >
          {isStation && (
            <>
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
              >
                <UserCircle className="h-4 w-4 text-zinc-500" />
                Station dashboard
              </Link>
              <div className="my-1 border-t border-white/10" />
            </>
          )}
          {isDj && (
            <>
              <Link
                href={`/dj/${user.username}`}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
              >
                <UserCircle className="h-4 w-4 text-zinc-500" />
                Public profile
              </Link>
              <Link
                href={`/dj/${user.username}?tab=archive`}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
              >
                <Archive className="h-4 w-4 text-zinc-500" />
                Set archive
              </Link>
              <div className="my-1 border-t border-white/10" />
            </>
          )}
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            <Settings className="h-4 w-4 text-zinc-500" />
            Settings
          </Link>
          <Link
            href="/help"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            <HelpCircle className="h-4 w-4 text-zinc-500" />
            Help
          </Link>
          <div className="my-1 border-t border-white/10" />
          <form action={logoutAction}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
