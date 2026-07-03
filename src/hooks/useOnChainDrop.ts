"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  encodeFunctionData,
  createPublicClient,
  http,
  keccak256,
  toBytes,
  type Abi,
} from "viem";
import {
  useWallet,
  useSendTransaction,
} from "@vechain/vechain-kit";
import { sponsoredDelegatorUrl } from "@/lib/vechain-delegator";
import type { TransactionClause } from "@vechain/sdk-core";
import type { TransactionReceipt } from "@vechain/sdk-network";
import { vechainTestnet } from "@/lib/web3/chains";
import { ABIS, CONTRACTS, contractsConfigured, parseDrop } from "@/lib/web3/contracts";

const RPC_URL =
  process.env.NEXT_PUBLIC_VECHAIN_RPC_URL ?? "https://rpc-testnet.vechain.energy";
const DELEGATOR_URL = sponsoredDelegatorUrl();

function contractClause(
  to: `0x${string}`,
  data: `0x${string}`,
  comment: string,
): TransactionClause {
  return { to, value: "0x0", data, comment };
}

function txIdFromReceipt(receipt: TransactionReceipt | null): `0x${string}` | null {
  if (!receipt) return null;
  const meta = receipt as TransactionReceipt & { meta?: { txID?: string } };
  const raw = meta.meta?.txID ?? (receipt as { id?: string }).id;
  if (!raw) return null;
  const hex = raw.startsWith("0x") ? raw : `0x${raw}`;
  return hex as `0x${string}`;
}

export function useOnChainDrop() {
  const { account, connection } = useWallet();
  const address = account?.address as `0x${string}` | undefined;
  const isConnected = connection.isConnected;
  const receiptRef = useRef<TransactionReceipt | null>(null);

  const { sendTransaction, isTransactionPending, txReceipt, resetStatus, error } =
    useSendTransaction({
      signerAccountAddress: address ?? "",
      delegationUrl: DELEGATOR_URL,
    });

  useEffect(() => {
    if (txReceipt) receiptRef.current = txReceipt;
  }, [txReceipt]);

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: vechainTestnet,
        transport: http(RPC_URL),
      }),
    [],
  );

  const [balanceWei, setBalanceWei] = useState<bigint | undefined>();

  const refetchBalance = useCallback(async () => {
    if (!address || !contractsConfigured()) return;
    const bal = await publicClient.readContract({
      address: CONTRACTS.dropToken,
      abi: ABIS.dropToken,
      functionName: "balanceOf",
      args: [address],
    });
    setBalanceWei(bal as bigint);
  }, [address, publicClient]);

  useEffect(() => {
    void refetchBalance();
  }, [refetchBalance]);

  const sendClauses = useCallback(
    async (clauses: TransactionClause[]) => {
      if (!address) throw new Error("Wallet not connected — enable your LiveBooth wallet first");
      resetStatus();
      receiptRef.current = null;
      await sendTransaction(clauses, DELEGATOR_URL, {
        title: "Confirm on LiveBooth",
        description: "Sign to complete this on-chain DROP action",
        buttonText: "Confirm",
      });
      if (error) {
        throw new Error(typeof error === "string" ? error : "Transaction failed");
      }
      const txId = txIdFromReceipt(receiptRef.current);
      if (!txId) throw new Error("Transaction failed — no receipt");
      await refetchBalance();
      return txId;
    },
    [address, error, refetchBalance, resetStatus, sendTransaction],
  );

  const sendContract = useCallback(
    async (
      to: `0x${string}`,
      abi: Abi,
      functionName: string,
      args: readonly unknown[],
      comment: string,
    ) => {
      const data = encodeFunctionData({ abi, functionName, args }) as `0x${string}`;
      return sendClauses([contractClause(to, data, comment)]);
    },
    [sendClauses],
  );

  async function faucet(amount = 100) {
    if (!contractsConfigured()) throw new Error("Contracts not configured");
    return sendContract(
      CONTRACTS.dropToken,
      ABIS.dropToken as Abi,
      "faucet",
      [parseDrop(amount)],
      `Mint ${amount} DROP from testnet faucet`,
    );
  }

  async function approveTipRouter(amount: number) {
    return sendContract(
      CONTRACTS.dropToken,
      ABIS.dropToken as Abi,
      "approve",
      [CONTRACTS.tipRouter, parseDrop(amount)],
      `Approve ${amount} DROP for tipping`,
    );
  }

  async function tipOnChain(djAddress: `0x${string}`, amount: number, streamId: string) {
    const streamBytes = keccak256(toBytes(streamId));
    return sendContract(
      CONTRACTS.tipRouter,
      ABIS.tipRouter as Abi,
      "tip",
      [djAddress, parseDrop(amount), streamBytes],
      `Tip ${amount} DROP on-chain`,
    );
  }

  async function claimAchievementOnChain(
    claimId: `0x${string}`,
    amount: number,
    deadline: bigint,
    signature: `0x${string}`,
  ) {
    return sendContract(
      CONTRACTS.achievementVault,
      ABIS.achievementVault as Abi,
      "claim",
      [claimId, parseDrop(amount), deadline, signature],
      "Claim achievement DROP reward",
    );
  }

  return {
    isConnected,
    address,
    balanceWei,
    contractsReady: contractsConfigured(),
    isPending: isTransactionPending,
    isEmbeddedWallet:
      connection.isConnectedWithSocialLogin || connection.isConnectedWithPrivy,
    walletSource: connection.source?.type ?? null,
    faucet,
    approveTipRouter,
    tipOnChain,
    claimAchievementOnChain,
    refetchBalance,
  };
}

/** @deprecated use useOnChainDrop */
export const useOnChainBeat = useOnChainDrop;
