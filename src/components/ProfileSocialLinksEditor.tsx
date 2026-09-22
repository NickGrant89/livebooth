"use client";

import { SOCIAL_PLATFORM_META, type SocialLinks } from "@/lib/profile-social";

export function ProfileSocialLinksEditor({
  value,
  onChange,
}: {
  value: SocialLinks;
  onChange: (links: SocialLinks) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Link-in-bio — shown on your public profile. Paste a full URL or @handle for Instagram.
      </p>
      {SOCIAL_PLATFORM_META.map(({ id, label, placeholder }) => (
        <label key={id} className="block">
          <span className="text-xs text-zinc-400">{label}</span>
          <input
            type="url"
            value={value[id] ?? ""}
            onChange={(e) => onChange({ ...value, [id]: e.target.value })}
            placeholder={placeholder}
            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
          />
        </label>
      ))}
    </div>
  );
}
