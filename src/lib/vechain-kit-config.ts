"use client";

import type { VechainKitProviderProps } from "@vechain/vechain-kit";
import { sponsoredDelegatorUrl } from "@/lib/vechain-delegator";

const NODE_URL =
  process.env.NEXT_PUBLIC_VECHAIN_NODE_URL ?? "https://testnet.vechain.org";

export function privyConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim() &&
      process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID?.trim(),
  );
}

export function buildVeChainKitProviderProps(): Omit<VechainKitProviderProps, "children"> {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();
  const privyClientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID?.trim();
  const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3008";

  const props: Omit<VechainKitProviderProps, "children"> = {
    darkMode: true,
    network: {
      type: "test",
      nodeUrl: NODE_URL,
    },
    feeDelegation: {
      delegatorUrl: sponsoredDelegatorUrl(),
      delegateAllTransactions: true,
    },
    dappKit: {
      allowedWallets: wcProjectId
        ? ["veworld", "sync2", "wallet-connect"]
        : ["veworld", "sync2"],
      usePersistence: true,
      v2Api: { enabled: true },
      ...(wcProjectId
        ? {
            walletConnectOptions: {
              projectId: wcProjectId,
              metadata: {
                name: "LiveBooth",
                description: "Live streaming with on-chain DROP tips",
                url: appUrl,
                icons: [`${appUrl.replace(/\/$/, "")}/window.svg`],
              },
            },
          }
        : {}),
    },
    loginMethods: privyAppId
      ? [
          { method: "email", gridColumn: 4 },
          { method: "veworld", gridColumn: 4 },
          { method: "google", gridColumn: 4 },
          { method: "more", gridColumn: 4 },
        ]
      : [
          { method: "veworld", gridColumn: 4 },
          { method: "google", gridColumn: 4 },
          { method: "vechain", gridColumn: 4 },
          { method: "more", gridColumn: 4 },
        ],
    loginModalUI: {
      description: "Create a LiveBooth on-chain wallet or connect VeWorld",
    },
    theme: {
      accent: "#53fc18",
    },
  };

  if (privyAppId && privyClientId) {
    props.privy = {
      appId: privyAppId,
      clientId: privyClientId,
      loginMethods: ["email", "google"],
      appearance: {
        accentColor: "#53fc18",
        loginMessage: "Sign in to enable your LiveBooth wallet",
        logo: `${appUrl.replace(/\/$/, "")}/window.svg`,
      },
      embeddedWallets: {
        createOnLogin: "all-users",
      },
    };
  }

  return props;
}
