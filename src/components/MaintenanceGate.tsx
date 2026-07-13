"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [status, setStatus] = useState<{
    maintenanceMode: boolean;
    maintenanceMessage: string;
  } | null>(null);

  useEffect(() => {
    apiFetch("/api/platform/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const isAdminRoute = pathname?.startsWith("/admin");
  const isAdmin = user?.role === "admin";
  const isAuthRoute =
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/signup") ||
    pathname?.startsWith("/verify-email");

  if (
    status?.maintenanceMode &&
    !isAdmin &&
    !isAdminRoute &&
    !isAuthRoute
  ) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <p className="text-lg font-semibold text-white mb-2">Under maintenance</p>
        <p className="text-sm text-zinc-400 max-w-md">{status.maintenanceMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
}
