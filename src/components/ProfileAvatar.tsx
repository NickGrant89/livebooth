import { avatarFallbackLabel, profileImageSrc } from "@/lib/profile-images";

type ProfileAvatarProps = {
  displayName: string;
  avatar?: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  borderClassName?: string;
};

const sizeClasses = {
  xs: "h-7 w-7 text-[10px] rounded-lg",
  sm: "h-8 w-8 text-xs rounded-lg",
  md: "h-12 w-12 text-sm rounded-xl",
  lg: "h-20 w-20 text-2xl rounded-2xl",
  xl: "h-24 w-24 text-2xl rounded-2xl",
  "2xl": "h-28 w-28 text-3xl rounded-2xl",
};

export function ProfileAvatar({
  displayName,
  avatar = "",
  avatarUrl,
  size = "md",
  className = "",
  borderClassName = "",
}: ProfileAvatarProps) {
  const src = profileImageSrc(avatarUrl);
  const fallback = avatarFallbackLabel(displayName, avatar);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={displayName}
        className={`shrink-0 object-cover bg-[#141416] ${sizeClasses[size]} ${borderClassName} ${className}`}
      />
    );
  }

  return (
    <div
      className={`shrink-0 flex items-center justify-center bg-gradient-to-br from-[#53fc18] to-[#00d4aa] font-bold text-black ${sizeClasses[size]} ${borderClassName} ${className}`}
    >
      {fallback}
    </div>
  );
}
