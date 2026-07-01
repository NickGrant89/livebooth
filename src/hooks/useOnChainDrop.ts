"use client";

import { useThor, useWallet } from "@vechain/dapp-kit-react";
import { encodeFunctionData, createPublicClient, http, keccak256, toBytes, type Abi } from "viem";
import { useCallback, useEffect, useMemo, useState } from "react";
import { vechainTestnet } from "@/lib/web3/chains";
import { ABIS, CONTRACTS, contractsConfigured, parseDrop } from "@/lib/web3/contracts";

const RPC_URL =
  process.env.NEXT_PUBLIC_VECHAIN_RPC_URL ?? "https://rpc-testnet.vechain.energy";

const TX_WAIT_MS = 120_000;

export function useOnChainDrop() {
  const { account, signer } = useWallet();
  const thor = useThor();
  const [pendingHash, setPendingHash] = useState<`0x${string}` | undefined>();
  const [isPending, setIsPending] = useState(false);
  const [balanceWei, setBalanceWei] = useState<bigint | undefined>();

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: vechainTestnet,
        transport: http(RPC_URL),
      }),
    [],
  );

  const address = account as `0x${string}` | undefined;
  const isConnected = Boolean(account);

  const waitForTx = useCallback(
    async (txId: string) => {
      const receipt = await thor.transactions.waitForTransaction(txId, {
        timeoutMs: TX_WAIT_MS,
      });
      if (!receipt) {
        throw new Error("Transaction timed out waiting for confirmation");
      }
      return txId as `0x${string}`;
    },
    [thor],
  );

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

  async function sendContract(
    to: `0x${string}`,
    abi: Abi,
    functionName: string,
    args: readonly unknown[],
  ) {
    if (!account) throw new Error("Wallet not connected");
    setIsPending(true);
    try {
      const data = encodeFunctionData({ abi, functionName, args });
      const hash = (await signer.sendTransaction({
        from: account,
        to,
        data,
      })) as string;
      const txHash = hash as `0x${string}`;
      setPendingHash(txHash);
      await waitForTx(txHash);
      return txHash;
    } finally {
      setIsPending(false);
    }
  }

  async function faucet(amount = 100) {
    if (!contractsConfigured()) throw new Error("Contracts not configured");
    const hash = await sendContract(CONTRACTS.dropToken, ABIS.dropToken as Abi, "faucet", [
      parseDrop(amount),
    ]);
    await refetchBalance();
    return hash;
  }

  async function approveTipRouter(amount: number) {
    return sendContract(CONTRACTS.dropToken, ABIS.dropToken as Abi, "approve", [
      CONTRACTS.tipRouter,
      parseDrop(amount),
    ]);
  }

  async function tipOnChain(djAddress: `0x${string}`, amount: number, streamId: string) {
    const streamBytes = keccak256(toBytes(streamId));
    return sendContract(CONTRACTS.tipRouter, ABIS.tipRouter as Abi, "tip", [
      djAddress,
      parseDrop(amount),
      streamBytes,
    ]);
  }

  async function claimAchievementOnChain(
    claimId: `0x${string}`,
    amount: number,
    deadline: bigint,
    signature: `0x${string}`,
  ) {
    return sendContract(CONTRACTS.achievementVault, ABIS.achievementVault as Abi, "claim", [
      claimId,
      parseDrop(amount),
      deadline,
      signature,
    ]);
  }

  return {
    isConnected,
    address,
    balanceWei,
    contractsReady: contractsConfigured(),
    isPending,
    faucet,
    approveTipRouter,
    tipOnChain,
    claimAchievementOnChain,
    refetchBalance,
  };
}

/** @deprecated use useOnChainDrop */
export const useOnChainBeat = useOnChainDrop;
