"use client";

import { AuthProvider, type AuthUser } from "@/context/AuthContext";

export function Providers({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}) {
  return <AuthProvider initialUser={initialUser}>{children}</AuthProvider>;
}
