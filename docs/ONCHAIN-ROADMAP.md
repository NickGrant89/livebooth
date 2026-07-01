# On-chain roadmap — what moves to VeChain vs stays in-app

> **Last updated:** 2026-06 · **Related:** [VECHAIN-TESTNET.md](./VECHAIN-TESTNET.md) · [10-tokenomics-stability.md](./design/10-tokenomics-stability.md) · [13-master-backlog.md](./design/13-master-backlog.md)

LiveBooth uses a **hybrid model**: fast in-app ledger (SQLite/Postgres) for UX, VeChain for value that needs wallet custody and transparency.

---

## Current state (testnet shipped)

| Layer | Technology | Purpose |
|-------|------------|---------|
| **In-app ledger** | Prisma `User.balance`, `LedgerEntry` | Tips (default), quests, unlocks, buy (demo/Stripe), withdraw requests |
| **On-chain** | DropToken, TipRouter, AchievementVault | Optional tips, achievement claims, testnet faucet |

**Deployed testnet contracts** — see [VECHAIN-TESTNET.md](./VECHAIN-TESTNET.md).

**Supply at deploy:**

- 1B DROP minted to deployer
- 1M DROP funded to AchievementVault
- Testnet faucet can mint +500 DROP/wallet/day (testing only)

---

## Design principle

| Keep **off-chain** | Move **on-chain** |
|--------------------|-------------------|
| Chat, presence, quests progress | Token transfers between wallets |
| Sub-second UX, no gas prompts | Provable tip splits (90/10) |
| Cheap to iterate in demo | Achievement payouts with signatures |
| Fiat buy / redeem bookkeeping | Collab splits, staking locks (future) |
| Admin moderation | Treasury movements users must trust |

**Rule of thumb:** If the user must **sign with VeWorld**, it belongs on-chain. If it's **engagement or content**, keep it off-chain unless there's a strong trust reason.

---

## Feature matrix

| Feature | Today | Target (mainnet soft launch) | Full on-chain (optional later) |
|---------|-------|-------------------------------|--------------------------------|
| **Fan tips** | Off-chain default; optional TipRouter | Same — off-chain default, on-chain opt-in | Default on-chain for wallet users |
| **Quest rewards** | Off-chain ledger | Off-chain | Optional vault claim for large rewards |
| **Achievements** | Off-chain claim + optional vault | Both paths | Vault-only above X DROP |
| **Buy DROP (Stripe)** | Credits in-app balance | Mint/transfer DROP on purchase OR keep pegged credits | Full mint-on-buy to wallet |
| **DJ withdraw** | Request → admin mark paid | Stripe Connect payout; ledger debit | Auto redeem contract + KYC gate |
| **Promote booth** | Off-chain DROP burn | Off-chain | On-chain burn event for transparency |
| **VIP subs** | Off-chain | Off-chain | Subscription NFT or recurring on-chain |
| **Collab tips** | DB split 50/50 | DB split; mirror on-chain tip if fan uses chain | CollabSplit contract |
| **Staking** | Off-chain ledger | Off-chain | Locked DROP in staking contract |
| **Leaderboard / grades** | Off-chain | Off-chain | ZK or oracle — not planned |
| **Chat / VOD / clips** | Off-chain | Off-chain | Never on-chain |

---

## Phased rollout

### Phase A — Internal economy (✅ shipped)

```
Fan buys / earns DROP  →  SQLite balance  →  spend in app  →  DJ balance  →  withdraw (admin)
```

- No wallet required
- Best for LAN demo and fast iteration

### Phase B — Hybrid crypto (🟡 in progress — testnet live)

```
                    ┌─────────────────┐
Fan VeWorld ───────►│ TipRouter       │──► DJ wallet (90%)
                    │ AchievementVault│──► Fan wallet (claim)
                    └─────────────────┘
                           ▲
Fan app (default) ──► SQLite ledger (mirror + chat)
```

**Done:**

- Contract deploy to VeChain testnet
- VeWorld via dapp-kit
- On-chain tips + achievement claims wired
- Withdrawal MVP (admin treasury)

**Remaining:**

- [ ] End-to-end on-chain tip verified in prod checklist
- [ ] Mainnet deploy + audited contracts
- [ ] `CLAIM_SIGNER` hardened (HSM / separate key from deployer)
- [ ] Buy DROP → optional wallet delivery

### Phase C — Fiat ↔ chain bridge (❌ not started)

| Flow | Mechanism |
|------|-----------|
| Buy DROP | Stripe → platform mints or transfers DROP to user wallet |
| Cash out | DJ balance → Stripe Connect; or on-chain DROP → treasury redeem |
| Peg | Fixed buy/redeem spread ([10-tokenomics-stability.md](./design/10-tokenomics-stability.md)) |

Platform stays **liquidity backstop** — chain is for settlement, not open speculation.

### Phase D — Advanced on-chain (❌ optional / later)

Only after in-app demand is proven:

- CollabSplit contract (B2B 50/50)
- DROP staking contract
- DEX liquidity (100M allocation bucket)
- Fee burn / buyback from treasury
- Legal review before external market

---

## Supply & inflation (production intent)

| Bucket | Allocation | On-chain enforcement |
|--------|------------|----------------------|
| Total cap | 1B DROP | `DropToken` max supply (to add before mainnet) |
| Community / achievements | 300M | Vault + timed release |
| Platform treasury | 200M | Multisig wallet |
| DJ grants | 150M | Vesting contract |
| Team | 150M | Vesting contract |
| Liquidity | 100M | Locked until Phase D |
| Ecosystem | 100M | Deal-by-deal |

**Testnet today:** deployer holds ~999M + faucet mints — **not** production tokenomics.

---

## What will **never** be fully on-chain

These stay server-side for cost, speed, and product reasons:

- Live chat and moderation
- Stream keys / HLS / VOD metadata
- Discover ranking and promote booth ordering
- Set scores, quest definitions, admin panel
- Email, push notifications, OAuth share

---

## Recommended next builds (order)

1. ✅ Testnet deploy + `.env` sync
2. 🟡 Verify on-chain tip + claim on [LOCAL-TEST-CHECKLIST.md](./LOCAL-TEST-CHECKLIST.md)
3. Stripe Connect for real DJ payouts (off-chain redeem, on-chain optional)
4. Postgres + Vercel ([PRODUCTION-DEPLOY.md](./PRODUCTION-DEPLOY.md))
5. Mainnet: cap supply, separate claim signer, audit
6. CollabSplit + staking (Phase D)

---

## Quick answers

**Will all DROP be on-chain?**  
No. Most day-to-day spending stays in the in-app ledger. On-chain is for wallet tips, claims, and eventually buy/redeem settlement.

**Why two balances?**  
Speed (no gas for every tip) and demo simplicity. Power users opt into VeWorld for real token movement.

**Is my 999M DROP real?**  
It's real **testnet** DROP on the contract, but you're the deployer who received the initial mint — not a typical fan balance.
