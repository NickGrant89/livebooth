"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  encodeFunctionData,
  createPublicClient,
  http,
  keccak256,
  toBytes,
  type Abi,
} from "viem";
import { useWallet, useSendTransaction } from "@vechain/vechain-kit";
import type { TransactionClause } from "@vechain/sdk-core";
import type { TransactionReceipt } from "@vechain/sdk-network";
import { vechainTestnet } from "@/lib/web3/chains";
import { ABIS, CONTRACTS, contractsConfigured, parseDrop } from "@/lib/web3/contracts";
import { sponsoredDelegatorUrl } from "@/lib/vechain-delegator";

const RPC_URL =
  process.env.NEXT_PUBLIC_VECHAIN_RPC_URL ?? "https://rpc-testnet.vechain.energy";
const DELEGATOR_URL = sponsoredDelegatorUrl();

export type OnChainDropApi = {
  isConnected: boolean;
  address?: `0x${string}`;
  balanceWei?: bigint;
  contractsReady: boolean;
  isPending: boolean;
  isEmbeddedWallet: boolean;
  walletSource: string | null;
  faucet: (amount?: number) => Promise<`0x${string}`>;
  approveTipRouter: (amount: number) => Promise<`0x${string}`>;
  tipOnChain: (djAddress: `0x${string}`, amount: number, streamId: string) => Promise<`0x${string}`>;
  claimAchievementOnChain: (
    claimId: `0x${string}`,
    amount: number,
    deadline: bigint,
    signature: `0x${string}`,
  ) => Promise<`0x${string}`>;
  refetchBalance: () => Promise<void>;
};

const emptyOnChainDrop: OnChainDropApi = {
  isConnected: false,
  contractsReady: contractsConfigured(),
  isPending: false,
  isEmbeddedWallet: false,
  walletSource: null,
  faucet: async () => {
    throw new Error("On-chain wallet is still loading");
  },
  approveTipRouter: async () => {
    throw new Error("On-chain wallet is still loading");
  },
  tipOnChain: async () => {
    throw new Error("On-chain wallet is still loading");
  },
  claimAchievementOnChain: async () => {
    throw new Error("On-chain wallet is still loading");
  },
  refetchBalance: async () => {},
};

const OnChainDropContext = createContext<OnChainDropApi>(emptyOnChainDrop);

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
  return (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`;
}

function useOnChainDropKit(): OnChainDropApi {
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

  const faucet = useCallback(
    async (amount = 100) => {
      if (!contractsConfigured()) throw new Error("Contracts not configured");
      return sendContract(
        CONTRACTS.dropToken,
        ABIS.dropToken as Abi,
        "faucet",
        [parseDrop(amount)],
        `Mint ${amount} DROP from testnet faucet`,
      );
    },
    [sendContract],
  );

  const approveTipRouter = useCallback(
    async (amount: number) =>
      sendContract(
        CONTRACTS.dropToken,
        ABIS.dropToken as Abi,
        "approve",
        [CONTRACTS.tipRouter, parseDrop(amount)],
        `Approve ${amount} DROP for tipping`,
      ),
    [sendContract],
  );

  const tipOnChain = useCallback(
    async (djAddress: `0x${string}`, amount: number, streamId: string) => {
      const streamBytes = keccak256(toBytes(streamId));
      return sendContract(
        CONTRACTS.tipRouter,
        ABIS.tipRouter as Abi,
        "tip",
        [djAddress, parseDrop(amount), streamBytes],
        `Tip ${amount} DROP on-chain`,
      );
    },
    [sendContract],
  );

  const claimAchievementOnChain = useCallback(
    async (
      claimId: `0x${string}`,
      amount: number,
      deadline: bigint,
      signature: `0x${string}`,
    ) =>
      sendContract(
        CONTRACTS.achievementVault,
        ABIS.achievementVault as Abi,
        "claim",
        [claimId, parseDrop(amount), deadline, signature],
        "Claim achievement DROP reward",
      ),
    [sendContract],
  );

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

export function OnChainDropProvider({ children }: { children: ReactNode }) {
  const value = useOnChainDropKit();
  return <OnChainDropContext.Provider value={value}>{children}</OnChainDropContext.Provider>;
}

export function useOnChainDrop(): OnChainDropApi {
  return useContext(OnChainDropContext);
}

/** @deprecated use useOnChainDrop */
export const useOnChainBeat = useOnChainDrop;
