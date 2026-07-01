import type { EIP1193Provider } from "viem";

type VeWorldProvider = EIP1193Provider & {
  isVeWorld?: boolean;
  isVeChain?: boolean;
  isInAppBrowser?: boolean;
  providers?: VeWorldProvider[];
};

function win() {
  return typeof window !== "undefined"
    ? (window as Window & { vechain?: VeWorldProvider; ethereum?: VeWorldProvider })
    : undefined;
}

/** Resolve VeWorld's EIP-1193 provider (never MetaMask's window.ethereum). */
export function getVeWorldProvider(): EIP1193Provider | undefined {
  const w = win();
  if (!w) return undefined;

  const vechain = w.vechain;
  if (vechain && typeof vechain.request === "function") return vechain;

  const eth = w.ethereum;
  if (eth?.isVeWorld && typeof eth.request === "function") return eth;

  if (eth?.providers?.length) {
    const veworld = eth.providers.find(
      (p) => p.isVeWorld || p.isVeChain || p === vechain,
    );
    if (veworld && typeof veworld.request === "function") return veworld;
  }

  return undefined;
}

/** VeWorld injects window.vechain — request() may appear after async injection. */
export function isVeWorldInstalled(): boolean {
  const w = win();
  if (!w) return false;
  return Boolean(w.vechain) || Boolean(getVeWorldProvider());
}

export function isLocalDevHost(): boolean {
  if (typeof window === "undefined") return true;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}
