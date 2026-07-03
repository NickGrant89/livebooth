"use client";

import type { VechainKitProviderProps } from "@vechain/vechain-kit";
import { sponsoredDelegatorUrl } from "@/lib/vechain-delegator";

const NODE_URL =
  process.env.NEXT_PUBLIC_VECHAIN_NODE_URL ?? "https://testnet.vechain.org";

/** Reject empty strings, placeholders, and other non-Privy values in Vercel env. */
function isValidPrivyAppId(value: string | undefined): value is string {
  const id = value?.trim();
  if (!id || id.length < 10) return false;
  if (!/^cl[a-z0-9]+$/i.test(id)) return false;
  if (/your|placeholder|example|changeme|xxx|todo/i.test(id)) return false;
  return true;
}

function isValidPrivyClientId(value: string | undefined): value is string {
  const id = value?.trim();
  if (!id || id.length < 8) return false;
  if (/your|placeholder|example|changeme|xxx|todo/i.test(id)) return false;
  return true;
}

export function privyConfigured(): boolean {
  return (
    isValidPrivyAppId(process.env.NEXT_PUBLIC_PRIVY_APP_ID) &&
    isValidPrivyClientId(process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID)
  );
}

export function buildVeChainKitProviderProps(): Omit<VechainKitProviderProps, "children"> {
  const privyEnabled = privyConfigured();
  const privyAppId = privyEnabled ? process.env.NEXT_PUBLIC_PRIVY_APP_ID!.trim() : undefined;
  const privyClientId = privyEnabled
    ? process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID!.trim()
    : undefined;
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
    loginMethods: privyEnabled
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

  if (privyEnabled && privyAppId && privyClientId) {
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
