export const STAFF_ROLES = ["admin", "moderator"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** Granular moderator capabilities — admins always have full access. */
export const MODERATOR_PERMISSIONS = [
  { id: "overview", label: "Overview", description: "Dashboard stats" },
  { id: "users_search", label: "Search users", description: "Find accounts by username or email" },
  { id: "users_suspend", label: "Suspend users", description: "Suspend and unsuspend fan/DJ accounts" },
  { id: "users_create", label: "Create users", description: "Add fan, DJ, and radio accounts" },
  { id: "users_invite", label: "Send invites", description: "Email login details to new users" },
  { id: "streams_view", label: "View live streams", description: "See who is live and stream metadata" },
  { id: "streams_stop", label: "Stop streams", description: "Force-end a live broadcast" },
  { id: "archives", label: "Archive", description: "Browse ended sets and replays" },
  { id: "stations_create", label: "Radio stations", description: "Create radio stations and assign owners" },
  { id: "moderation", label: "Moderation", description: "Reports, flags, AI scans, chat reports" },
  { id: "support", label: "Support", description: "Live support tickets and replies" },
] as const;

export type ModeratorPermissionId = (typeof MODERATOR_PERMISSIONS)[number]["id"];

export const MODERATOR_PERMISSION_IDS = MODERATOR_PERMISSIONS.map((p) => p.id);

const PERM_SET = new Set<string>(MODERATOR_PERMISSION_IDS);

export const DEFAULT_MODERATOR_PERMISSIONS: ModeratorPermissionId[] = [...MODERATOR_PERMISSION_IDS];

/** Admin panel tabs visible when a mod has any listed permission. */
export const MODERATOR_TAB_PERMISSIONS: Record<string, ModeratorPermissionId[]> = {
  overview: ["overview"],
  users: ["users_search", "users_suspend", "users_create", "users_invite"],
  streams: ["streams_view", "streams_stop"],
  archives: ["archives"],
  stations: ["stations_create"],
  moderation: ["moderation"],
  support: ["support"],
};

/** @deprecated Use MODERATOR_TAB_PERMISSIONS + hasModeratorPermission */
export const MODERATOR_TAB_IDS = Object.keys(MODERATOR_TAB_PERMISSIONS);

export const MODERATOR_CREATABLE_USER_ROLES = ["fan", "dj", "station"] as const;
export type ModeratorCreatableUserRole = (typeof MODERATOR_CREATABLE_USER_ROLES)[number];

export function isModeratorCreatableUserRole(role: string): role is ModeratorCreatableUserRole {
  return (MODERATOR_CREATABLE_USER_ROLES as readonly string[]).includes(role);
}

export function parseModeratorPermissions(raw: string | null | undefined): ModeratorPermissionId[] {
  if (!raw || raw === "[]") return [...DEFAULT_MODERATOR_PERMISSIONS];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_MODERATOR_PERMISSIONS];
    const filtered = parsed.filter(
      (p): p is ModeratorPermissionId => typeof p === "string" && PERM_SET.has(p),
    );
    return filtered.length > 0 ? filtered : [...DEFAULT_MODERATOR_PERMISSIONS];
  } catch {
    return [...DEFAULT_MODERATOR_PERMISSIONS];
  }
}

export function serializeModeratorPermissions(perms: ModeratorPermissionId[]): string {
  const unique = [...new Set(perms.filter((p) => PERM_SET.has(p)))];
  return JSON.stringify(unique.length > 0 ? unique : DEFAULT_MODERATOR_PERMISSIONS);
}

export function hasModeratorPermission(
  role: string,
  permissions: ModeratorPermissionId[] | string | null | undefined,
  permission: ModeratorPermissionId,
): boolean {
  if (role === "admin") return true;
  if (role !== "moderator") return false;
  const perms = Array.isArray(permissions)
    ? permissions
    : parseModeratorPermissions(permissions ?? "[]");
  return perms.includes(permission);
}

export function moderatorCanAccessTab(
  role: string,
  permissions: ModeratorPermissionId[] | string | null | undefined,
  tabId: string,
): boolean {
  if (role === "admin") return true;
  const required = MODERATOR_TAB_PERMISSIONS[tabId];
  if (!required?.length) return false;
  const perms = Array.isArray(permissions)
    ? permissions
    : parseModeratorPermissions(permissions ?? "[]");
  return required.some((p) => perms.includes(p));
}

export function isStaffRole(role: string): role is StaffRole {
  return role === "admin" || role === "moderator";
}

export function isFullAdminRole(role: string): boolean {
  return role === "admin";
}

export function isProtectedStaffTarget(role: string): boolean {
  return role === "admin" || role === "moderator";
}
