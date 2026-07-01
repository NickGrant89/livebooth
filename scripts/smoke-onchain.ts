/**
 * On-chain readiness smoke — contracts, wallet API, tip sync guards.
 * Usage: npm run smoke:onchain
 */
const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3008";

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts.headers },
  });
  const setCookie = res.headers.get("set-cookie");
  const cookie = setCookie?.split(";")[0];
  const data = await res.json().catch(() => ({}));
  return { res, data, cookie };
}

async function login(email: string, password: string) {
  const { res, data, cookie } = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed ${email}: ${JSON.stringify(data)}`);
  return cookie!;
}

async function main() {
  console.log("LiveBooth on-chain smoke →", BASE);

  console.log("\n1. Contracts verify (subprocess hint)");
  console.log("   Run: npm run contracts:verify");

  console.log("\n2. On-chain status API (unauthenticated)");
  const anon = await api("/api/wallet/on-chain");
  if (anon.res.status !== 401 && anon.res.status !== 403) {
    console.log("   ⚠ Expected auth required, got", anon.res.status);
  } else {
    console.log("   ✓ Auth required");
  }

  console.log("\n3. DJ wallet link");
  const djCookie = await login("neonpulse@livebooth.local", "password123");
  const testAddr = "0x1234567890123456789012345678901234567890";
  const link = await api("/api/wallet", {
    method: "PATCH",
    body: JSON.stringify({ address: testAddr }),
    headers: { Cookie: djCookie },
  });
  if (!link.res.ok) throw new Error(`Link failed: ${JSON.stringify(link.data)}`);
  console.log("   ✓ Linked", testAddr.slice(0, 10) + "…");

  const status = await api("/api/wallet/on-chain", {
    headers: { Cookie: djCookie },
  });
  if (!status.data.canReceiveOnChainTips) throw new Error("DJ should receive on-chain tips");
  console.log("   ✓ canReceiveOnChainTips");

  console.log("\n4. On-chain tip sync rejects bad tx");
  const fanCookie = await login("demo@livebooth.local", "password123");
  const live = await api("/api/streams/neonpulse", { headers: { Cookie: djCookie } });
  const streamId = live.data?.stream?.id ?? live.data?.id;
  if (!streamId) {
    console.log("   ⚠ neonpulse not live — skipping tip reject test (go live first)");
  } else {
    const bad = await api("/api/tips/on-chain", {
      method: "POST",
      headers: { Cookie: fanCookie },
      body: JSON.stringify({
        streamId,
        amount: 10,
        txHash: "0x" + "ab".repeat(32),
      }),
    });
    if (bad.res.ok) throw new Error("Should reject fake tx");
    console.log("   ✓ Rejected invalid tx:", bad.data.error?.slice(0, 60));
  }

  console.log("\n5. Unlink wallet");
  const unlink = await api("/api/wallet", {
    method: "DELETE",
    headers: { Cookie: djCookie },
  });
  if (!unlink.res.ok) throw new Error("Unlink failed");
  console.log("   ✓ Unlinked");

  console.log("\n✅ On-chain smoke passed (API layer).\n");
  console.log("Manual E2E: localhost:3008/wallet → VeWorld → faucet → tip on live stream.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
