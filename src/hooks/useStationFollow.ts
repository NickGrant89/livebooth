"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";

type StationFollowState = {
  following: boolean;
  followerCount: number;
  checked: boolean;
  loading: boolean;
  error: string;
};

const defaultState = (): StationFollowState => ({
  following: false,
  followerCount: 0,
  checked: false,
  loading: false,
  error: "",
});

type Store = {
  state: StationFollowState;
  listeners: Set<() => void>;
};

const stores = new Map<string, Store>();

function getStore(slug: string): Store {
  let store = stores.get(slug);
  if (!store) {
    store = { state: defaultState(), listeners: new Set() };
    stores.set(slug, store);
  }
  return store;
}

function setStoreState(slug: string, patch: Partial<StationFollowState>) {
  const store = getStore(slug);
  store.state = { ...store.state, ...patch };
  for (const listener of store.listeners) listener();
}

function subscribe(slug: string, listener: () => void) {
  const store = getStore(slug);
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}

function getSnapshot(slug: string) {
  return getStore(slug).state;
}

async function loadFollowStatus(slug: string) {
  try {
    const res = await apiFetch(`/api/stations/${slug}/follow`);
    const data = (await res.json()) as {
      following?: boolean;
      followerCount?: number;
      error?: string;
    };
    if (!res.ok) {
      setStoreState(slug, {
        checked: true,
        error: data.error ?? "Could not load follow status",
      });
      return;
    }
    setStoreState(slug, {
      following: Boolean(data.following),
      followerCount: data.followerCount ?? 0,
      checked: true,
      error: "",
    });
  } catch {
    setStoreState(slug, {
      checked: true,
      error: "Could not load follow status",
    });
  }
}

export function useStationFollow(slug: string) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const state = useSyncExternalStore(
    (listener) => subscribe(slug, listener),
    () => getSnapshot(slug),
    () => defaultState(),
  );

  useEffect(() => {
    void loadFollowStatus(slug);
  }, [slug, user?.id]);

  const toggle = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      window.location.href = `/login?next=${encodeURIComponent(`/station/${slug}`)}`;
      return;
    }

    setStoreState(slug, { loading: true, error: "" });
    const res = await apiFetch(`/api/stations/${slug}/follow`, {
      method: state.following ? "DELETE" : "POST",
    });
    const data = (await res.json().catch(() => ({}))) as {
      following?: boolean;
      followerCount?: number;
      error?: string;
    };

    if (!res.ok) {
      setStoreState(slug, {
        loading: false,
        error: data.error ?? "Could not update follow",
      });
      return;
    }

    setStoreState(slug, {
      following: data.following ?? !state.following,
      followerCount:
        data.followerCount ??
        (state.following
          ? Math.max(0, state.followerCount - 1)
          : state.followerCount + 1),
      loading: false,
      error: "",
    });
    router.refresh();
  }, [authLoading, router, slug, state.following, state.followerCount, user]);

  return {
    ...state,
    authLoading,
    toggle,
    refresh: () => loadFollowStatus(slug),
  };
}
