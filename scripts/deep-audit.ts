/**
 * Deep production audit — pages, help anchors, APIs, external infra.
 * Usage: SMOKE_BASE_URL=https://livebooth.uk npx tsx scripts/deep-audit.ts
 */
const BASE = (process.env.SMOKE_BASE_URL ?? "https://livebooth.uk").replace(/\/$/, "");

type Result = { path: string; status: number; ok: boolean; note?: string };

const STATIC_PAGES = [
  "/",
  "/help",
  "/help/fans",
  "/help/djs",
  "/help/stations",
  "/support",
  "/policies",
  "/privacy",
  "/terms",
  "/roadmap",
  "/transparency",
  "/wallet",
  "/login",
  "/signup",
  "/forgot-password",
  "/verify-email",
  "/leaderboard",
  "/achievements",
  "/residencies",
  "/go-live",
  "/dashboard",
  "/settings",
  "/crate",
  "/collab",
  "/guide",
];

const HELP_ANCHORS = [
  "/help/fans#getting-started",
  "/help/fans#watching",
  "/help/fans#drop",
  "/help/fans#membership",
  "/help/fans#replays",
  "/help/fans#quests",
  "/help/fans#achievements",
  "/help/fans#account",
  "/help/djs#getting-started",
  "/help/djs#going-live",
  "/help/djs#obs",
  "/help/djs#earning",
  "/help/djs#supporters",
  "/help/djs#collab",
  "/help/djs#growth",
  "/help/djs#support",
  "/help/stations#getting-started",
  "/help/stations#tiers",
  "/help/stations#residents",
  "/help/stations#embed",
  "/help/stations#membership",
  "/help/stations#support",
  "/support#faq",
];

const PUBLIC_APIS = [
  "/api/health",
  "/api/platform/status",
  "/api/transparency",
  "/api/discover/live",
  "/api/leaderboard",
];

const INFRA_URLS = [
  { name: "Recordings CDN", url: "https://hls.livebooth.uk/recordings/" },
  { name: "HLS recordings root", url: "https://hls.livebooth.uk/recordings/" },
];

async function check(path: string, opts?: { expectJson?: boolean; allowAuth?: boolean }): Promise<Result> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { Accept: opts?.expectJson ? "application/json" : "text/html" },
    });
    const ok =
      res.status >= 200 && res.status < 400 ||
      (opts?.allowAuth && res.status === 401);
    let note: string | undefined;
    if (opts?.expectJson && res.ok) {
      const j = await res.json().catch(() => null);
      if (!j) note = "invalid JSON";
    }
    if (path.includes("#") && res.ok) {
      const html = await fetch(url.split("#")[0]!).then((r) => r.text());
      const anchor = path.split("#")[1]!;
      if (!html.includes(`id="${anchor}"`) && !html.includes(`id='${anchor}'`)) {
        note = `anchor #${anchor} not found in HTML`;
      }
    }
    return { path, status: res.status, ok: ok && !note?.includes("not found"), note };
  } catch (e) {
    return { path, status: 0, ok: false, note: String(e) };
  }
}

async function checkStaleCopy(path: string): Promise<string[]> {
  const issues: string[] = [];
  const html = await fetch(`${BASE}${path}`).then((r) => r.text());
  const stale = [
    { pattern: /\bCore\b.*\bLegend\b/gi, msg: "old Core/Legend tier copy" },
    { pattern: /Lock DROP on a DJ/gi, msg: "old staking copy" },
    { pattern: /minimum 50 DROP/gi, msg: "old 50 DROP minimum" },
  ];
  for (const { pattern, msg } of stale) {
    if (pattern.test(html)) issues.push(msg);
  }
  return issues;
}

async function main() {
  console.log(`\n🔍 LiveBooth deep audit → ${BASE}\n`);

  const results: Result[] = [];
  const staleIssues: { path: string; issues: string[] }[] = [];

  for (const p of STATIC_PAGES) results.push(await check(p));
  for (const p of HELP_ANCHORS) results.push(await check(p));
  for (const p of PUBLIC_APIS) results.push(await check(p, { expectJson: true, allowAuth: p.includes("cron") }));

  // Cron should be 401 without auth
  const cron = await check("/api/cron/membership-billing", { allowAuth: true });
  cron.ok = cron.status === 401;
  cron.note = cron.status === 401 ? "protected" : cron.status === 503 ? "CRON_SECRET missing" : `unexpected ${cron.status}`;
  results.push(cron);

  for (const { name, url } of INFRA_URLS) {
    const r = await check(url);
    r.path = `[infra] ${name}`;
    results.push(r);
  }

  for (const p of ["/help/fans", "/help/djs", "/help/stations", "/support", "/help"]) {
    const issues = await checkStaleCopy(p);
    if (issues.length) staleIssues.push({ path: p, issues });
  }

  const failed = results.filter((r) => !r.ok);
  const passed = results.filter((r) => r.ok);

  console.log(`Pages & APIs: ${passed.length}/${results.length} OK\n`);

  for (const r of results) {
    const icon = r.ok ? "✓" : "✗";
    const extra = r.note ? ` (${r.note})` : "";
    console.log(`${icon} ${r.status || "ERR"} ${r.path}${extra}`);
  }

  if (staleIssues.length) {
    console.log("\n⚠ Stale copy detected:");
    for (const { path, issues } of staleIssues) {
      console.log(`  ${path}: ${issues.join(", ")}`);
    }
  } else {
    console.log("\n✓ No stale staking/VIP copy on help pages");
  }

  // Check internal link patterns in help hub
  const helpHtml = await fetch(`${BASE}/help`).then((r) => r.text());
  const hrefs = [...helpHtml.matchAll(/href="(\/[^"#?]+(?:#[^"]*)?)"/g)].map((m) => m[1]!);
  const uniqueHrefs = [...new Set(hrefs)].filter((h) => h.startsWith("/") && !h.startsWith("/api"));
  console.log(`\nLink check from /help (${uniqueHrefs.length} internal hrefs)...`);
  let linkFails = 0;
  for (const href of uniqueHrefs.slice(0, 30)) {
    const pathOnly = href.split("#")[0]!;
    const r = await check(pathOnly);
    if (!r.ok) {
      console.log(`  ✗ broken link ${href} → ${r.status}`);
      linkFails++;
    }
  }
  if (linkFails === 0) console.log("  ✓ Sampled /help links OK");

  console.log("");
  if (failed.length === 0 && staleIssues.length === 0 && linkFails === 0) {
    console.log("✅ Deep audit passed.\n");
    process.exit(0);
  }
  console.log(`❌ ${failed.length} route failures, ${staleIssues.length} stale copy pages, ${linkFails} broken help links\n`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
