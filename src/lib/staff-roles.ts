export const STAFF_ROLES = ["admin", "moderator"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const MODERATOR_TAB_IDS = [
  "overview",
  "users",
  "streams",
  "archives",
  "moderation",
  "support",
] as const;

export function isStaffRole(role: string): role is StaffRole {
  return role === "admin" || role === "moderator";
}

export function isFullAdminRole(role: string): boolean {
  return role === "admin";
}

export function isProtectedStaffTarget(role: string): boolean {
  return role === "admin" || role === "moderator";
}
