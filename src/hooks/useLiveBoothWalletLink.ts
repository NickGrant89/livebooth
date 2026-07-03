"use client";

import { useEffect, useRef } from "react";
import { useWallet } from "@vechain/vechain-kit";
import { useAuth } from "@/context/AuthContext";

/** Auto-link VeChain Kit wallet (embedded or VeWorld) to the LiveBooth account. */
export function useLiveBoothWalletLink(enabled = true) {
  const { account, connection } = useWallet();
  const { user, linkWallet, refresh } = useAuth();
  const linkingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !connection.isConnected) return;
    const address = account?.address;
    if (!address || !user) return;

    const linked = user.walletAddress?.toLowerCase();
    if (linked === address.toLowerCase()) return;
    if (linkingRef.current) return;

    linkingRef.current = true;
    linkWallet(address)
      .then(() => refresh())
      .catch(() => {
        /* wallet may already belong to another account */
      })
      .finally(() => {
        linkingRef.current = false;
      });
  }, [
    account?.address,
    connection.isConnected,
    enabled,
    linkWallet,
    refresh,
    user,
    user?.walletAddress,
  ]);
}
