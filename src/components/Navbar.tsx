"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  Radio,
  Trophy,
  Wallet,
  LayoutDashboard,
  BarChart3,
  LogIn,
  Users,
  Music,
  Menu,
  X,
  Settings,
  Shield,
  UserCircle,
  Archive,
  BookOpen,
} from "lucide-react";
import { useAuth, formatTokens } from "@/context/AuthContext";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";
import { NavbarSearch } from "@/components/NavbarSearch";
import { NotificationBell } from "@/components/NotificationBell";
import { UserMenu } from "@/components/UserMenu";
import { APP_TAGLINE } from "@/lib/constants";
import { HELP_LINKS } from "@/lib/help-links";

const nav = [
  { href: "/", label: "Discover", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, djOnly: true },
  { href: "/go-live", label: "Go Live", icon: Radio, djOnly: true },
  { href: "/achievements", label: "Rewards", icon: Trophy },
  { href: "/leaderboard", label: "Rankings", icon: BarChart3 },
  { href: "/collab", label: "Collab", icon: Users, djOnly: true, wideOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, mobileOnly: true },
];

function navLinkClass(active: boolean) {
  return `flex items-center gap-1.5 rounded-lg px-2.5 xl:px-3 py-2 text-xs xl:text-[13px] font-medium transition-all ${
    active ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
  }`;
}

export function Navbar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNav = nav.filter(({ djOnly, mobileOnly, wideOnly }) => {
    if (mobileOnly) return false;
    if (wideOnly) return false; // desktop: Collab in mobile menu only
    if (djOnly && user?.role !== "dj" && user?.role !== "admin") return false;
    return true;
  });

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/[0.06]">
      <div className="mx-auto flex h-14 sm:h-[64px] max-w-[1600px] items-center gap-2 sm:gap-3 px-3 sm:px-4 lg:px-6 min-w-0">
        <Logo size="md" />

        <p className="hidden 2xl:block text-[11px] text-zinc-600 max-w-[120px] leading-snug border-l border-white/10 pl-4 shrink-0">
          {APP_TAGLINE}
        </p>

        <div className="hidden md:flex flex-1 min-w-0 max-w-xs lg:max-w-sm xl:max-w-md">
          <NavbarSearch />
        </div>

        <nav className="hidden lg:flex items-center gap-0.5 ml-auto shrink-0">
          {(user?.role === "admin" || user?.role === "moderator") && (
            <Link
              href="/admin"
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs xl:text-[13px] font-medium transition-all ${
                pathname === "/admin"
                  ? "bg-red-500/15 text-red-300 border border-red-500/30"
                  : "text-red-400 hover:text-red-300 hover:bg-red-500/10"
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">{user.role === "admin" ? "Admin" : "Mod"}</span>
            </Link>
          )}
          {visibleNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              title={label}
              className={navLinkClass(pathname === href)}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden xl:inline">{label}</span>
            </Link>
          ))}
          <Link
            href={HELP_LINKS.hub}
            title="Help"
            className={navLinkClass(pathname.startsWith("/help") || pathname === HELP_LINKS.support)}
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden xl:inline">Help</span>
          </Link>
        </nav>

        <div className="flex items-center gap-1 sm:gap-1.5 ml-auto lg:ml-0 shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {!loading && user ? (
            <>
              <Link
                href="/crate"
                className="hidden sm:flex p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
                title="Track crate"
              >
                <Music className="h-4 w-4" />
              </Link>
              <Link
                href="/wallet"
                className="hidden sm:flex items-center gap-1 rounded-xl bg-[#53fc18]/10 border border-[#53fc18]/20 px-2.5 py-1.5 hover:border-[#53fc18]/40 transition-colors"
                title="Wallet"
              >
                <Wallet className="h-3.5 w-3.5 text-[#53fc18]" />
                <span className="text-xs xl:text-sm font-bold text-[#53fc18] font-mono">
                  {formatTokens(user.balance)}
                </span>
              </Link>
              <NotificationBell />
              <UserMenu user={user} />
            </>
          ) : (
            !loading && (
              <Link href="/login" className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2 text-sm">
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            )
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-white/[0.06] px-4 py-3 space-y-3 bg-[#0a0a0c]/95 backdrop-blur-xl">
          <NavbarSearch />
          <div className="grid grid-cols-2 gap-2">
            {(user?.role === "admin" || user?.role === "moderator") && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium col-span-2 ${
                  pathname === "/admin" ? "bg-red-500/15 text-red-300" : "bg-red-500/10 text-red-400"
                }`}
              >
                <Shield className="h-4 w-4" />
                {user.role === "admin" ? "Admin panel" : "Mod panel"}
              </Link>
            )}
            {nav
              .filter(({ mobileOnly, djOnly }) => {
                if (mobileOnly) return false;
                if (djOnly && user?.role !== "dj" && user?.role !== "admin") return false;
                return true;
              })
              .map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${
                    pathname === href ? "bg-white/10 text-white" : "bg-white/5 text-zinc-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            <Link
              href={HELP_LINKS.hub}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium col-span-2 ${
                pathname.startsWith("/help") || pathname === HELP_LINKS.support
                  ? "bg-white/10 text-white"
                  : "bg-white/5 text-zinc-400"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Help center
            </Link>
            {(user?.role === "dj" || user?.role === "admin") && (
              <>
                <Link
                  href={`/dj/${user.username}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium bg-white/5 text-zinc-400"
                >
                  <UserCircle className="h-4 w-4" />
                  Profile
                </Link>
                <Link
                  href={`/dj/${user.username}?tab=archive`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium bg-white/5 text-zinc-400 col-span-2"
                >
                  <Archive className="h-4 w-4" />
                  Set archive
                </Link>
              </>
            )}
            {user && (
              <>
                <Link
                  href="/settings"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium bg-white/5 text-zinc-400"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <form action={logoutAction} className="col-span-2">
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm text-zinc-400 text-left"
                  >
                    Sign out
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
