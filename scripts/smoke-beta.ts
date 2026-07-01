/**
 * Beta smoke test — signup → go live → watch → tip → chat → end set → grade
 *
 * Usage:
 *   npm run smoke:beta
 *   SMOKE_BASE_URL=https://staging.example.com npm run smoke:beta
 */
const BASE = (process.env.SMOKE_BASE_URL ?? "http://localhost:3008").replace(/\/$/, "");

type Json = Record<string, unknown>;

function mergeCookies(existing: string, setCookie: string | null): string {
  const jar = new Map<string, string>();
  for (const part of existing.split(";").map((s) => s.trim()).filter(Boolean)) {
    const [k, ...v] = part.split("=");
    if (k) jar.set(k, v.join("="));
  }
  if (setCookie) {
    const first = setCookie.split(";")[0];
    const [k, ...v] = first.split("=");
    if (k) jar.set(k.trim(), v.join("="));
  }
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function api(
  path: string,
  opts: RequestInit & { cookie?: string } = {},
): Promise<{ res: Response; data: Json; cookie: string }> {
  const { cookie = "", ...init } = opts;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const data = (await res.json().catch(() => ({}))) as Json;
  const nextCookie = mergeCookies(cookie, res.headers.get("set-cookie"));
  return { res, data, cookie: nextCookie };
}

function assertOk(label: string, res: Response, data: Json) {
  if (!res.ok) {
    throw new Error(`${label}: HTTP ${res.status} — ${JSON.stringify(data)}`);
  }
}

async function main() {
  const ts = Date.now();
  const djEmail = `smoke-dj-${ts}@example.com`;
  const fanEmail = `smoke-fan-${ts}@example.com`;
  const password = "smoke-test-pass-1";

  console.log(`LiveBooth beta smoke → ${BASE}\n`);

  console.log("1. Health — home page");
  const home = await fetch(`${BASE}/`);
  if (!home.ok) throw new Error(`Home failed: ${home.status}`);
  console.log("   ✓ Home OK");

  let cookie = "";

  console.log("2. Signup DJ");
  {
    const { res, data, cookie: c } = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: djEmail,
        password,
        username: `dj${ts}`,
        displayName: "Smoke DJ",
        role: "dj",
      }),
    });
    assertOk("DJ signup", res, data);
    cookie = c;
    console.log(`   ✓ DJ @${(data.user as Json)?.username}`);
  }

  console.log("3. Go live");
  let streamId = "";
  let ingestKey = "";
  {
    const { res, data, cookie: c } = await api("/api/streams/go-live", {
      method: "POST",
      cookie,
      body: JSON.stringify({ title: "Smoke test set", genre: "techno" }),
    });
    assertOk("Go live", res, data);
    cookie = c;
    const stream = data.stream as Json;
    streamId = String(stream.id);
    ingestKey = String(stream.ingestKey ?? "");
    console.log(`   ✓ Stream ${streamId} key ${ingestKey.slice(0, 12)}…`);
  }

  console.log("4. Signup fan");
  let fanCookie = "";
  {
    const { res, data, cookie: c } = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: fanEmail,
        password,
        username: `fan${ts}`,
        displayName: "Smoke Fan",
        role: "fan",
      }),
    });
    assertOk("Fan signup", res, data);
    fanCookie = c;
    console.log(`   ✓ Fan @${(data.user as Json)?.username}`);
  }

  console.log("5. Fan tip + chat");
  {
    const { res, data, cookie: c } = await api("/api/tips", {
      method: "POST",
      cookie: fanCookie,
      body: JSON.stringify({
        streamId,
        amount: 25,
        message: "smoke test tip",
      }),
    });
    assertOk("Tip", res, data);
    fanCookie = c;
    console.log("   ✓ Tip 25 DROP");
  }
  {
    const { res, data, cookie: c } = await api(`/api/chat/${streamId}`, {
      method: "POST",
      cookie: fanCookie,
      body: JSON.stringify({ message: "smoke test chat" }),
    });
    assertOk("Chat", res, data);
    fanCookie = c;
    console.log("   ✓ Chat message");
  }

  console.log("6. Set score (live)");
  {
    const { res, data } = await api(`/api/set-score/${streamId}`, { cookie: fanCookie });
    assertOk("Set score", res, data);
    console.log(`   ✓ Score ${data.score} (${data.gradePace})`);
  }

  console.log("7. End stream + grade");
  {
    const { res, data, cookie: c } = await api("/api/streams/go-live", {
      method: "DELETE",
      cookie,
    });
    assertOk("End stream", res, data);
    cookie = c;
    const recap = data.recap as Json | undefined;
    console.log(
      `   ✓ Grade ${recap?.setGrade ?? "?"} · ${recap?.setScore ?? "?"} pts · stream ${data.streamId}`,
    );
  }

  console.log("8. RTMP auth endpoint");
  {
    const res = await fetch(`${BASE}/api/rtmp/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "publish",
        path: `live/${ingestKey}`,
        protocol: "rtmp",
      }),
    });
    if (!res.ok) {
      console.log(`   ⚠ RTMP auth returned ${res.status} (enable RTMP_AUTH_ENABLED=true on staging to test deny)`);
    } else {
      console.log("   ✓ RTMP auth callback reachable");
    }
  }

  console.log("\n✅ Beta smoke passed.\n");
}

main().catch((e) => {
  console.error("\n❌ Smoke failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
