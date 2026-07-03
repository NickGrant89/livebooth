/** Profile image URL validation (HTTPS or resized data URL from settings upload). */

const MAX_AVATAR_DATA_LEN = 400_000;
const MAX_BANNER_DATA_LEN = 600_000;

export function isAllowedProfileImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("https://")) return true;
  if (trimmed.startsWith("http://") && process.env.NODE_ENV !== "production") return true;
  if (trimmed.startsWith("data:image/jpeg;base64,")) {
    return trimmed.length <= MAX_BANNER_DATA_LEN;
  }
  if (trimmed.startsWith("data:image/png;base64,")) {
    return trimmed.length <= MAX_BANNER_DATA_LEN;
  }
  if (trimmed.startsWith("data:image/webp;base64,")) {
    return trimmed.length <= MAX_BANNER_DATA_LEN;
  }
  return false;
}

export function sanitizeProfileImageUrl(url: string | undefined, maxDataLen: number): string {
  if (url === undefined) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (!isAllowedProfileImageUrl(trimmed)) {
    throw new Error("Image must be an https:// URL or uploaded photo");
  }
  if (trimmed.startsWith("data:") && trimmed.length > maxDataLen) {
    throw new Error("Image file is too large — use a smaller photo");
  }
  return trimmed;
}

export function profileImageSrc(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("data:image/")
  ) {
    return trimmed;
  }
  return null;
}

export function avatarFallbackLabel(displayName: string, avatar: string): string {
  const initials = avatar?.trim();
  if (initials && !initials.startsWith("http") && !initials.startsWith("data:")) {
    return initials.slice(0, 2).toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}
