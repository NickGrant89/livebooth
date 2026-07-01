"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, BellOff, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

export function WebPushToggle({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [configured, setConfigured] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    if (!user) return;
    apiFetch("/api/push/subscribe")
      .then((r) => r.json())
      .then((d) => {
        setConfigured(Boolean(d.configured));
        setSubscribed(Boolean(d.subscribed));
      })
      .catch(() => undefined);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!user || !configured) return null;

  async function enable() {
    setLoading(true);
    setError("");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setError("Push not supported in this browser");
        return;
      }

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setError("Notification permission denied");
        return;
      }

      const vapidRes = await apiFetch("/api/push/vapid");
      const vapid = await vapidRes.json();
      if (!vapid.publicKey) {
        setError("Push not configured");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
        });
      }

      const json = sub.toJSON();
      const res = await apiFetch("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      if (!res.ok) throw new Error("Could not save subscription");
      setSubscribed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to enable alerts");
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    setError("");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await apiFetch("/api/push/subscribe", {
          method: "DELETE",
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      } else {
        await apiFetch("/api/push/subscribe", { method: "DELETE", body: "{}" });
      }
      setSubscribed(false);
    } catch {
      setError("Failed to disable alerts");
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={subscribed ? disable : enable}
        disabled={loading}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 border-t border-white/5"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : subscribed ? (
          <BellOff className="h-4 w-4 text-zinc-500" />
        ) : (
          <BellRing className="h-4 w-4 text-[#53fc18]" />
        )}
        {subscribed ? "Disable go-live push" : "Enable go-live push alerts"}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Go-live push alerts</p>
          <p className="text-xs text-zinc-500 mt-1">
            Get a browser notification when DJs you follow start streaming.
          </p>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </div>
        <button
          type="button"
          onClick={subscribed ? disable : enable}
          disabled={loading}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            subscribed
              ? "bg-white/10 text-zinc-300 hover:bg-white/15"
              : "bg-[#53fc18]/15 text-[#53fc18] hover:bg-[#53fc18]/25"
          }`}
        >
          {loading ? "…" : subscribed ? "On" : "Enable"}
        </button>
      </div>
    </div>
  );
}
