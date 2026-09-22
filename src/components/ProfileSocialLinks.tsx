import { Camera, ExternalLink, Globe, Music2, Radio } from "lucide-react";
import type { SocialLinks, SocialPlatform } from "@/lib/profile-social";

const ICONS: Record<SocialPlatform, typeof Globe> = {
  instagram: Camera,
  soundcloud: Music2,
  mixcloud: Radio,
  twitter: Globe,
  website: Globe,
};

const LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  soundcloud: "SoundCloud",
  mixcloud: "Mixcloud",
  twitter: "X",
  website: "Website",
};

export function ProfileSocialLinks({ links }: { links: SocialLinks }) {
  const entries = (Object.entries(links) as [SocialPlatform, string][]).filter(([, url]) =>
    Boolean(url),
  );
  if (entries.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {entries.map(([platform, url]) => {
        const Icon = ICONS[platform];
        return (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 hover:border-[#53fc18]/30 hover:text-white transition-colors"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-[#53fc18]" />
            {LABELS[platform]}
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
        );
      })}
    </div>
  );
}
