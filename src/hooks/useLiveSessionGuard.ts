"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

/** Re-sync session when returning to the tab or when auth no longer has a live stream. */
export function useLiveSessionGuard({
  hasLocalSession,
  onSessionEnded,
}: {
  hasLocalSession: boolean;
  onSessionEnded: () => void | Promise<void>;
}) {
  const { user, refresh } = useAuth();
  const onSessionEndedRef = useRef(onSessionEnded);
  const syncingRef = useRef(false);

  useEffect(() => {
    onSessionEndedRef.current = onSessionEnded;
  }, [onSessionEnded]);

  useEffect(() => {
    if (!user || user.liveStream || !hasLocalSession || syncingRef.current) return;
    syncingRef.current = true;
    void Promise.resolve(onSessionEndedRef.current()).finally(() => {
      syncingRef.current = false;
    });
  }, [user, user?.liveStream, hasLocalSession]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      void refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);
}
