# VeChain testnet redeploy + mainnet Safe multisig

Step-by-step for LiveBooth DROP contracts.

---

## Part 1 — Redeploy hardened contracts (testnet)

### Prerequisites

- `DEPLOYER_PRIVATE_KEY` in `.env` (66-char hex, VeWorld path `m/44'/818'/0'/0/0`)
- Deploy wallet funded: [faucet.vecha.in](https://faucet.vecha.in/) → `0x23630Aa9C614523E83a5Adb5CCe9A0E383a942f4` (or your deployer address)

### One command

```bash
cd ~/Projects/NickStreaming
npm run contracts:deploy
npm run contracts:sync-env
npm run contracts:verify
npm run contracts:env    # copy-paste block for Vercel
```

### Current testnet deploy (2026-07-13)

| Contract | Address |
|----------|---------|
| DropToken | `0x5ed900bdef82d2f08eca0963e1116ff0040c61df` |
| TipRouter | `0x296b1b6d53ce3d8c53e557c2a333ac5c8b58bbe2` |
| AchievementVault | `0x4670f14adc58b71b7e873571be5e095494039866` |
| Chain ID | `100010` |
| Faucet | **enabled** (testnet only) |
| Deployer | `0x23630Aa9C614523E83a5Adb5CCe9A0E383a942f4` |

Explorer: [explore.vechain.org](https://explore.vechain.org/) → toggle **Testnet** → search contract address.

### Update Vercel (required for livebooth.uk)

**Settings → Environment Variables → Production:**

```
NEXT_PUBLIC_CHAIN_ID=100010
NEXT_PUBLIC_VECHAIN_RPC_URL=https://rpc-testnet.vechain.energy
NEXT_PUBLIC_VECHAIN_NODE_URL=https://testnet.vechain.org
NEXT_PUBLIC_DROP_TOKEN_ADDRESS=0x5ed900bdef82d2f08eca0963e1116ff0040c61df
NEXT_PUBLIC_TIP_ROUTER_ADDRESS=0x296b1b6d53ce3d8c53e557c2a333ac5c8b58bbe2
NEXT_PUBLIC_ACHIEVEMENT_VAULT_ADDRESS=0x4670f14adc58b71b7e873571be5e095494039866
```

**Server-only (same wallet as deployer for testnet dev):**

```
CLAIM_SIGNER_PRIVATE_KEY=0x...your_deployer_key...
```

Then **Redeploy** the Vercel project (Deployments → … → Redeploy).

> Old addresses (`0x3ce357…`, `0xa544…`, `0xb833…`) are obsolete after this redeploy.

### Smoke test after Vercel redeploy

1. [livebooth.uk/wallet](https://livebooth.uk/wallet) → Connect VeWorld (testnet)
2. Faucet → +500 DROP
3. Link wallet on a DJ account
4. Fan tips with **On-chain DROP** on a stream
5. Claim an achievement on-chain at `/achievements`

---

## Part 2 — VeChain Safe multisig (mainnet treasury)

Use **VeChain Safe** (official Gnosis Safe fork for VeChain):

**Dashboard:** [https://safe-dashboard.vechain.org/](https://safe-dashboard.vechain.org/)

Connect with **VeWorld** (recommended) or WalletConnect.

### Recommended setup (mainnet launch)

| Setting | Recommendation |
|---------|----------------|
| Threshold | **2-of-3** (small team) or **3-of-5** (production) |
| Signers | Hardware wallets or separate VeWorld accounts — not browser hot keys |
| Never use | 1-of-1 (no benefit), 5-of-5 (one lost key bricks treasury) |

### Steps

1. **Create Safe Account** on [safe-dashboard.vechain.org](https://safe-dashboard.vechain.org/)
   - Switch network to **Mainnet** when ready (testnet Safe optional for practice)
   - Add owner addresses (your + co-founder + backup)
   - Set threshold (e.g. 2-of-3)
   - Pay VET/VTHO gas to deploy the Safe contract

2. **Save the Safe address** — e.g. `0xYourSafe...`

3. **Deploy LiveBooth mainnet contracts** (when audited):

   ```bash
   cd contracts
   npx hardhat run scripts/deploy.ts --network vechainMainnet
   ```

   Faucet is **auto-disabled** on chain `100009`.

4. **Transfer ownership to Safe** (via deployer wallet, one-time each):

   - `DropToken.transferOwnership(safeAddress)` — if you need owner ops later
   - `TipRouter.transferOwnership(safeAddress)`
   - `AchievementVault.transferOwnership(safeAddress)`

   Or batch via Safe UI: **New transaction → Contract interaction**.

5. **Set platform treasury** (from Safe as TipRouter owner):

   ```solidity
   tipRouter.setPlatformTreasury(safeAddress)
   ```

   10% of on-chain tips flow here.

6. **Set claim signer** (dedicated hot wallet, NOT the Safe):

   ```solidity
   achievementVault.setClaimSigner(0xDedicatedClaimSigner...)
   ```

   Put `CLAIM_SIGNER_PRIVATE_KEY` on Vercel only — never in Safe.

7. **Fund AchievementVault** from Safe:

   - Approve DROP spend from Safe
   - Call `achievementVault.fund(amount)`

8. **Move DROP treasury** — deploy mints 1B to deployer; transfer allocation buckets to Safe via multisig transfers (do not leave 1B on hot wallet).

### Role split (mainnet)

| Role | Wallet type |
|------|-------------|
| Platform treasury (tip 10%) | **Safe multisig** |
| Contract owner (rotate signer/treasury) | **Safe multisig** |
| Achievement claim signer | **Dedicated server key** (Vercel env) |
| Deployer hot wallet | **Empty after setup** — fund only for gas during deploy |

### Security checklist before mainnet

- [ ] Third-party audit complete ([MAINNET-CONTRACTS.md](./MAINNET-CONTRACTS.md))
- [ ] Safe created on mainnet with 2-of-3+ threshold
- [ ] All contract `owner()` → Safe address
- [ ] `platformTreasury` → Safe address
- [ ] Claim signer ≠ Safe owners
- [ ] `faucetEnabled == false` on DropToken
- [ ] `totalSupply() == 1_000_000_000e18`
- [ ] Vercel env updated to mainnet addresses + `NEXT_PUBLIC_CHAIN_ID=100009`

---

## Quick reference

| Task | Command / URL |
|------|----------------|
| Redeploy testnet | `npm run contracts:deploy` |
| Sync local `.env` | `npm run contracts:sync-env` |
| Verify RPC + bytecode | `npm run contracts:verify` |
| Print Vercel vars | `npm run contracts:env` |
| VeChain Safe | [safe-dashboard.vechain.org](https://safe-dashboard.vechain.org/) |
| Mainnet hardening spec | [MAINNET-CONTRACTS.md](./MAINNET-CONTRACTS.md) |
