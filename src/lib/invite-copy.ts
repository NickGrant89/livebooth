import { HELP_LINKS } from "./help-links";

export type InviteRole = "fan" | "dj" | "station" | "admin";

export function inviteRoleLabel(role: string): string {
  if (role === "station") return "Radio";
  if (role === "dj") return "DJ";
  if (role === "admin") return "Admin";
  return "Fan";
}

export function guideUrlForRole(role: string): string {
  if (role === "station") return HELP_LINKS.stations;
  if (role === "dj" || role === "admin") return HELP_LINKS.djs;
  return HELP_LINKS.fans;
}

export function formatBetaInviteText(opts: {
  displayName: string;
  email: string;
  tempPassword: string;
  role: string;
  appUrl?: string;
}): string {
  const appUrl = opts.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://livebooth.uk";
  const roleLabel = inviteRoleLabel(opts.role);
  const guide = `${appUrl}${guideUrlForRole(opts.role)}`;

  return `You're invited to the LiveBooth beta (${roleLabel}).

Login: ${appUrl}/login
Email: ${opts.email}
Temp password: ${opts.tempPassword}

Change your password in Settings after your first sign-in.
Guide: ${guide}
Support: ${appUrl}/support`;
}
