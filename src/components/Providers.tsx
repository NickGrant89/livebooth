"use client";

import { AuthProvider, type AuthUser } from "@/context/AuthContext";
import { Web3Provider } from "@/components/Web3Provider";

export function Providers({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}) {
  return (
    <Web3Provider>
      <AuthProvider initialUser={initialUser}>{children}</AuthProvider>
    </Web3Provider>
  );
}
