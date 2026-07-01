import {
  createPublicClient,
  decodeEventLog,
  http,
  keccak256,
  toBytes,
  type Hash,
} from "viem";
import { vechainTestnet } from "./chains";
import { ABIS, CONTRACTS, parseDrop } from "./contracts";

const RPC_URL =
  process.env.NEXT_PUBLIC_VECHAIN_RPC_URL ?? "https://rpc-testnet.vechain.energy";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Normalize VeChain / EVM tx id to 0x + 64 hex. */
export function normalizeTxHash(raw: string): Hash | null {
  const trimmed = raw.trim();
  const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
  if (!/^[a-fA-F0-9]{64}$/.test(hex)) return null;
  return (`0x${hex.toLowerCase()}`) as Hash;
}

export async function verifyOnChainTip(params: {
  txHash: Hash;
  expectedDj: `0x${string}`;
  expectedAmount: number;
  streamId: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!CONTRACTS.tipRouter) {
    return { ok: false, reason: "TipRouter not configured" };
  }

  const client = createPublicClient({
    chain: vechainTestnet,
    transport: http(RPC_URL),
  });

  let receipt = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      receipt = await client.getTransactionReceipt({ hash: params.txHash });
      if (receipt) break;
    } catch {
      /* indexing lag */
    }
    await sleep(attempt === 0 ? 500 : 1500);
  }

  if (!receipt) {
    return { ok: false, reason: "Transaction receipt not found yet — try again in a few seconds" };
  }
  if (receipt.status !== "success") {
    return { ok: false, reason: "Transaction failed on-chain" };
  }

  const streamBytes = keccak256(toBytes(params.streamId));
  const expectedAmountWei = parseDrop(params.expectedAmount);
  const djLower = params.expectedDj.toLowerCase();

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== CONTRACTS.tipRouter.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: ABIS.tipRouter,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "Tip") continue;
      const args = decoded.args as unknown as {
        dj: `0x${string}`;
        amount: bigint;
        streamId: `0x${string}`;
      };
      if (args.dj.toLowerCase() !== djLower) continue;
      if (args.amount !== expectedAmountWei) {
        return { ok: false, reason: "Tip amount does not match transaction" };
      }
      if (args.streamId !== streamBytes) {
        return { ok: false, reason: "Stream id does not match transaction" };
      }
      return { ok: true };
    } catch {
      continue;
    }
  }

  return { ok: false, reason: "No matching Tip event found for this stream" };
}
