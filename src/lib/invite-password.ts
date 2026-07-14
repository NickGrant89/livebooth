/** Short random password for beta invites — no ambiguous chars (0/O, 1/l/I). */
export function generateInvitePassword(length = 8): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]!;
  }
  return out;
}
