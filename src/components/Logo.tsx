import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  link?: boolean;
}

const sizes = {
  sm: { box: "h-8 w-8", icon: 18, text: "text-base", tag: "text-[10px]" },
  md: { box: "h-9 w-9", icon: 20, text: "text-lg", tag: "text-[11px]" },
  lg: { box: "h-14 w-14", icon: 32, text: "text-3xl", tag: "text-sm" },
};

function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="4" y="10" width="24" height="16" rx="3" fill="url(#lb-grad)" />
      <path
        d="M8 14h16M8 18h10"
        stroke="#000"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.35"
      />
      <circle cx="22" cy="18" r="2" fill="#000" opacity="0.5" />
      <path
        d="M16 4v4M12 6l4-2 4 2"
        stroke="url(#lb-grad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="3" r="1.5" fill="#53fc18" />
      <defs>
        <linearGradient id="lb-grad" x1="4" y1="10" x2="28" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#53fc18" />
          <stop offset="1" stopColor="#15CFF4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({ size = "md", showTagline = false, link = true }: LogoProps) {
  const s = sizes[size];
  const inner = (
    <div className="flex items-center gap-2.5 shrink-0 group min-w-0">
      <div
        className={`flex ${s.box} items-center justify-center rounded-xl bg-black/40 border border-white/10 shadow-lg shadow-[#53fc18]/10 group-hover:scale-105 transition-transform shrink-0`}
      >
        <LogoMark size={s.icon} />
      </div>
      <div className="min-w-0 hidden sm:block">
        <span className={`${s.text} font-bold tracking-tight block leading-none`}>
          Live<span className="text-gradient">Booth</span>
        </span>
        {showTagline && (
          <span className={`${s.tag} text-zinc-500 mt-0.5 block truncate`}>{APP_TAGLINE}</span>
        )}
      </div>
    </div>
  );

  if (link) {
    return (
      <Link href="/" title={APP_NAME} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#53fc18]/50 rounded-lg">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function LogoMarkOnly({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-xl bg-black/40 border border-white/10 ${className}`}>
      <LogoMark size={22} />
    </div>
  );
}
