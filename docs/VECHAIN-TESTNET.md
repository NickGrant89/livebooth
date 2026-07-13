# VeChain testnet — LiveBooth guide

Current as of June 2026. Use this doc for deploy, VeWorld, explorer links, and on-chain tips.

See also: [VECHAIN-REDEPLOY-AND-MULTISIG.md](./VECHAIN-REDEPLOY-AND-MULTISIG.md) · [MAINNET-CONTRACTS.md](./MAINNET-CONTRACTS.md)

## Quick links (verified working)

| What | URL |
|------|-----|
| **Block explorer** | [explore.vechain.org](https://explore.vechain.org/) → switch **Testnet** (top-right) |
| **Testnet node** | [testnet.vechain.org](https://testnet.vechain.org) |
| **VET faucet** | [faucet.vecha.in](https://faucet.vecha.in/) |
| **VeWorld wallet** | [veworld.com](https://www.veworld.com/) |
| **Official dev docs** | [docs.vechain.org](https://docs.vechain.org/) |
| **Build overview** | [vechain.org/build-on-vechain](https://vechain.org/build-on-vechain-developer-resources-patterns-tools) |

### Explorer — important

- **Use:** [https://explore.vechain.org](https://explore.vechain.org/)
- **Toggle Testnet** in the top-right (not Mainnet).
- Search your address in the search bar, e.g. `0x23630Aa9C614523E83a5Adb5CCe9A0E383a942f4`.

**Do not use** `explore-testnet.vechain.org` — that hostname currently returns **DNS NXDOMAIN** (broken). Official docs still mention it; the unified explorer at `explore.vechain.org` with the Testnet toggle is what works.

**Do not expose** an open RTMP port without `RTMP_AUTH_ENABLED=true` on the app — see [rtmp-server/README.md](../rtmp-server/README.md).

The account page shows **VET** and **VTHO** only. **DROP** (VIP-180) won't appear there — use the steps below or check balance in the app.

---

## LiveBooth contracts (your deploy)

After `npm run contracts:deploy` + `npm run contracts:sync-env`:

| Contract | Testnet address |
|----------|-----------------|
| DropToken (DROP) | `0x5ed900bdef82d2f08eca0963e1116ff0040c61df` |
| TipRouter | `0x296b1b6d53ce3d8c53e557c2a333ac5c8b58bbe2` |
| AchievementVault | `0x4670f14adc58b71b7e873571be5e095494039866` |
| Chain ID | `100010` |

View DROP on explorer (Testnet toggle on):

1. Open [explore.vechain.org](https://explore.vechain.org/) → **Testnet**
2. Search `0x3ce357a7ddb16a35ee6cd41fe0b9e0f2e27a719c` (DropToken contract)
3. Or check **Token transfers** on your wallet address

---

## `.env`

```bash
DEPLOYER_PRIVATE_KEY="0x..."          # VeWorld-derived, path m/44'/818'/0'/0/0
NEXT_PUBLIC_VECHAIN_NODE_URL="https://testnet.vechain.org"
NEXT_PUBLIC_VECHAIN_RPC_URL="https://rpc-testnet.vechain.energy"
NEXT_PUBLIC_CHAIN_ID="100010"
NEXT_PUBLIC_DROP_TOKEN_ADDRESS="0x5ed900bdef82d2f08eca0963e1116ff0040c61df"
NEXT_PUBLIC_TIP_ROUTER_ADDRESS="0x296b1b6d53ce3d8c53e557c2a333ac5c8b58bbe2"
NEXT_PUBLIC_ACHIEVEMENT_VAULT_ADDRESS="0x4670f14adc58b71b7e873571be5e095494039866"
```

Run `npm run contracts:sync-env` after deploy to fill contract addresses.

> **Dead URLs:** `testnet.veblocks.net`, `explore-testnet.vechain.org` — do not use.

---

## Deploy contracts

Hardhat uses `@vechain/sdk-hardhat-plugin` → talks to `https://testnet.vechain.org` directly (not the JSON-RPC proxy).

```bash
npm run contracts:deploy
npm run contracts:sync-env
npm run demo:start
```

Deploy wallet needs **testnet VET + VTHO** from [faucet.vecha.in](https://faucet.vecha.in/).

---

## VeWorld + LiveBooth app

### Browser

- Use **`http://localhost:3008`** — VeWorld often **won't inject** on LAN IPs like `192.168.x.x`.
- Install [VeWorld extension](https://www.veworld.com/) → set network to **Testnet**.
- App uses **VeChain dapp-kit** (not MetaMask).

### Derive deploy key from VeWorld seed (local only)

```bash
cd contracts
MNEMONIC="word1 word2 ..." node -e "
const { HDNodeWallet } = require('ethers');
const w = HDNodeWallet.fromPhrase(process.env.MNEMONIC.trim(), undefined, \"m/44'/818'/0'/0/0\");
console.log('Address:', w.address);
"
```

---

## Test on-chain tips (step-by-step)

### 1. DJ links wallet

| | |
|---|---|
| Login | `neonpulse@livebooth.local` / `password123` |
| URL | [localhost:3008/wallet](http://localhost:3008/wallet) |
| Action | **Connect VeWorld** → approve |

This saves the DJ's wallet address so on-chain tips know where to send.

### 2. Fan connects + tips

| | |
|---|---|
| Login | `demo@livebooth.local` / `password123` |
| Wallet | [localhost:3008/wallet](http://localhost:3008/wallet) → **Connect VeWorld** |
| Stream | [localhost:3008/stream/neonpulse](http://localhost:3008/stream/neonpulse) |
| Tip | Click **Tip** in chat → check **Tip on-chain via VeWorld** → Send |

VeWorld will prompt twice: **approve** TipRouter, then **tip** transaction.

### 3. Off-chain fallback

Uncheck **On-chain** — tips use in-app DROP balance (no VeWorld tx). Good for quick demo testing.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Explorer link DNS error | Use [explore.vechain.org](https://explore.vechain.org/) + **Testnet** toggle |
| No DROP on explorer account page | Normal — VIP-180 tokens aren't listed with VET; search DropToken contract or use app `/wallet` |
| VeWorld button disabled | Open `localhost:3008`, not LAN IP; refresh after installing extension |
| MetaMask popup | App uses dapp-kit + VeWorld only |
| `Provider not found` | Connect on `/wallet` first; use localhost |
| `eth_getTransactionReceipt` RPC error | Fixed in app — uses VeChain node for tx confirmation, not public JSON-RPC |
| On-chain checkbox missing | DJ must link VeWorld on `/wallet`; fan must connect VeWorld; click **Tip** to expand form |
| `Internal error` on deploy | Fund deploy wallet with VET/VTHO; use Hardhat VeChain plugin (not `:8545` proxy) |
| `private key too short` | `.env` has address instead of 66-char private key |

---

## Local demo (no blockchain)

```bash
npm run demo:fresh    # reset DB + seed
npm run demo:start    # http://localhost:3008
```

Demo accounts: `demo@`, `neonpulse@`, `admin@livebooth.local` — password `password123`.
