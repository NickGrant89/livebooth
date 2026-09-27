/** Trim + lowercase for login / signup identifiers. */
export function normalizeAuthIdentifier(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Prisma `where` clause for email (case-insensitive) or username login. */
export function userWhereForAuthIdentifier(identifier: string) {
  const id = normalizeAuthIdentifier(identifier);
  return {
    OR: [
      { email: { equals: id, mode: "insensitive" as const } },
      { username: id.replace(/@.*/, "") },
    ],
  };
}
