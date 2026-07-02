"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { DROP_TOKEN_SYMBOL } from "@/lib/constants";
import { apiFetch } from "@/lib/fetch-client";

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  role: string;
  avatar: string;
  balance: number;
  totalEarned: number;
  walletAddress?: string | null;
  liveStream?: {
    id: string;
    title: string;
    status?: string;
    ingestKey?: string | null;
    rtmpUrl?: string | null;
    playbackUrl?: string | null;
    ingestMode?: "livepeer" | "local" | "demo";
  } | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  linkWallet: (address: string) => Promise<void>;
  buyDrop: (amount: number) => Promise<void>;
  /** @deprecated use buyDrop */
  buyBeat: (amount: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: ReactNode;
  initialUser?: AuthUser | null;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [loading, setLoading] = useState(initialUser === null);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch("/api/auth/me");
      if (!res.ok) return;
      const data = await res.json();
      setUser(data.user ?? null);
    } catch {
      /* keep server-bootstrapped session on transient API errors */
    }
  }, []);

  // Re-sync session after server-action login/logout navigations
  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [pathname, refresh]);

  const logout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const linkWallet = async (address: string) => {
    const res = await apiFetch("/api/wallet", {
      method: "PATCH",
      body: JSON.stringify({ address }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Failed to link wallet");
    }
    await refresh();
  };

  const buyDrop = async (amount: number) => {
    const res = await apiFetch("/api/wallet", {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? "Purchase failed");
    }
    await refresh();
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, refresh, logout, linkWallet, buyDrop, buyBeat: buyDrop }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function formatTokens(amount: number): string {
  return `${amount.toLocaleString()} ${DROP_TOKEN_SYMBOL}`;
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
