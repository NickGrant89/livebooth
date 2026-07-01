"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { StationSetupWizard } from "@/components/StationSetupWizard";
import { StationOwnerDashboard } from "@/components/StationOwnerDashboard";

/** Setup wizard or owner dashboard for station accounts. */
export function StationOwnerSection() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"loading" | "setup" | "dashboard">("loading");
  const [suggestedSlug, setSuggestedSlug] = useState("");
  const [dashboardKey, setDashboardKey] = useState(0);

  const checkStatus = useCallback(() => {
    setMode("loading");
    apiFetch("/api/stations/owner")
      .then(async (res) => {
        const data = await res.json();
        if (data.setupRequired) {
          setSuggestedSlug(data.suggestedSlug ?? user?.username ?? "");
          setMode("setup");
          return;
        }
        if (res.ok) {
          setMode("dashboard");
          return;
        }
        setMode("setup");
        setSuggestedSlug(user?.username ?? "");
      })
      .catch(() => {
        setMode("setup");
        setSuggestedSlug(user?.username ?? "");
      });
  }, [user?.username]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  if (mode === "loading") {
    return (
      <div className="rounded-xl border border-white/10 bg-[#141416] p-8 text-center text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        Loading station…
      </div>
    );
  }

  if (mode === "setup") {
    return (
      <StationSetupWizard
        suggestedSlug={suggestedSlug}
        suggestedName={user?.displayName ?? ""}
        suggestedAvatar={user?.avatar ?? user?.displayName?.slice(0, 2).toUpperCase() ?? ""}
        onComplete={() => {
          setDashboardKey((k) => k + 1);
          setMode("dashboard");
        }}
      />
    );
  }

  return <StationOwnerDashboard key={dashboardKey} />;
}
