# Mainnet contract hardening & audit prep

LiveBooth DROP contracts on VeChain mainnet (chain **100009**) must be deployed **once** with production-safe settings. Testnet (100010) keeps the faucet for demos.

---

## Changes in this repo (pre-mainnet)

| Contract | Hardening |
|----------|-----------|
| **DropToken** | `MAX_SUPPLY = 1B` enforced on all mints; `faucet()` only when `faucetEnabled=true` at deploy (testnet only) |
| **TipRouter** | `Ownable`; `setPlatformTreasury()` for multisig migration |
| **AchievementVault** | `Ownable`; `setClaimSigner()` restricted to owner (not old signer) |

---

## Deploy checklist

### Testnet (re-deploy after contract changes)

```bash
# .env: DEPLOYER_PRIVATE_KEY=0x...
npm run contracts:deploy
npm run contracts:sync-env
npm run contracts:verify
```

Faucet auto-enables on chain 100010.

### Mainnet (when ready)

1. **New deployer wallet** — never reuse testnet hot key
2. **Multisig treasury** — Gnosis Safe on VeChain for `platformTreasury` + contract `owner`
3. **Separate claim signer** — dedicated key in HSM/KMS; `CLAIM_SIGNER_PRIVATE_KEY` on Vercel only
4. Deploy:

```bash
cd contracts && npx hardhat run scripts/deploy.ts --network vechainMainnet
```

5. Transfer `DropToken`, `TipRouter`, `AchievementVault` **ownership** to multisig
6. `setPlatformTreasury(multisig)` on TipRouter
7. `setClaimSigner(dedicatedSigner)` on AchievementVault
8. Fund vault from treasury allocation (not full 1B — use tokenomics buckets)
9. Update Vercel env: `NEXT_PUBLIC_CHAIN_ID=100009` + new addresses

---

## Audit prep package

Provide auditors:

- `contracts/src/*.sol`
- `contracts/test/Drop.test.ts`
- Deploy script + constructor args (mainnet: `faucetEnabled=false`)
- [ONCHAIN-ROADMAP.md](./ONCHAIN-ROADMAP.md) hybrid model diagram
- [design/02-tokenomics.md](./design/02-tokenomics.md) allocation table

**In-scope questions for audit:**

- TipRouter reentrancy + fee math (10%)
- AchievementVault signature replay (`claimId`, deadline)
- DropToken max supply bypass paths
- Owner centralization (treasury/signer rotation)

**Out of scope (Phase 3+):** CollabSplit, staking, mint-on-Stripe

---

## Post-audit before launch

- [ ] Remove or disable testnet faucet on any mainnet artifact
- [ ] Verify `totalSupply() == 1e9 * 1e18` after deploy
- [ ] Multisig owns all three contracts
- [ ] Claim signer ≠ deployer ≠ treasury day-to-day key
- [ ] `npm run contracts:verify` against mainnet RPC
- [ ] One mainnet test tip + achievement claim on staging

---

## Token distribution (mainnet intent)

| Bucket | Amount | Holder |
|--------|--------|--------|
| Total cap | 1B DROP | — |
| At deploy | 1B to deployer | Move to treasury multisig |
| Achievement vault | e.g. 1M+ | `AchievementVault.fund()` |
| Team / investors / liquidity | per tokenomics doc | vesting wallets (off-chain until vesting contract) |

Do **not** leave 1B DROP on a single hot wallet on mainnet.
