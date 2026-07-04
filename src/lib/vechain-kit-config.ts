"use client";

import type { VechainKitProviderProps } from "@vechain/vechain-kit";
import { sponsoredDelegatorUrl } from "@/lib/vechain-delegator";

const NODE_URL =
  process.env.NEXT_PUBLIC_VECHAIN_NODE_URL ?? "https://testnet.vechain.org";

function stripEnv(value: string | undefined): string | undefined {
  const v = value?.trim().replace(/^["']|["']$/g, "");
  return v || undefined;
}

/** Prefer the live browser origin so Privy/OAuth metadata match the site users are on. */
function getAppUrl(): string {
  if (typeof window !== "undefined") {
    const { origin, hostname } = window.location;
    if (
      (origin.startsWith("https://") || origin.startsWith("http://")) &&
      hostname !== "localhost" &&
      !/^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    ) {
      return origin;
    }
  }
  const fromEnv = stripEnv(process.env.NEXT_PUBLIC_APP_URL);
  if (fromEnv && !fromEnv.includes("192.168.") && !fromEnv.includes("localhost")) {
    return fromEnv.replace(/\/$/, "");
  }
  return "https://livebooth.uk";
}

function isValidPrivyAppId(value: string | undefined): value is string {
  const id = stripEnv(value);
  if (!id || id.length < 20) return false;
  // Privy app IDs are public alphanumeric strings (legacy cl… or newer cm… formats).
  if (!/^[a-z0-9]+$/i.test(id)) return false;
  if (/your|placeholder|example|changeme|xxx|todo/i.test(id)) return false;
  return true;
}

function isValidPrivyClientId(value: string | undefined): value is string {
  const id = stripEnv(value);
  if (!id || id.length < 8) return false;
  if (/your|placeholder|example|changeme|xxx|todo/i.test(id)) return false;
  // Web app clients from the Privy dashboard (Clients tab).
  if (id.startsWith("client-")) return id.length >= 20;
  return id.length >= 20;
}

export function privyConfigured(): boolean {
  return (
    isValidPrivyAppId(process.env.NEXT_PUBLIC_PRIVY_APP_ID) &&
    isValidPrivyClientId(process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID)
  );
}

export function buildVeChainKitProviderProps(): Omit<VechainKitProviderProps, "children"> {
  const privyEnabled = privyConfigured();
  const privyAppId = privyEnabled ? stripEnv(process.env.NEXT_PUBLIC_PRIVY_APP_ID)! : undefined;
  const privyClientId = privyEnabled
    ? stripEnv(process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID)!
    : undefined;
  const wcProjectId = stripEnv(process.env.NEXT_PUBLIC_WC_PROJECT_ID);
  const appUrl = getAppUrl();

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
