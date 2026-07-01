/** True when DATABASE_URL points at a local SQLite file (legacy dev). */
export function isSqliteDatabaseUrl(url: string): boolean {
  return url.startsWith("file:") || url.startsWith("sqlite:");
}

export function getDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ??
    "postgresql://livebooth:livebooth@localhost:5432/livebooth"
  );
}

export function isPostgresDatabaseUrl(url: string): boolean {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}
