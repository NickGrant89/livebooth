"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";

export type DjSearchResult = {
  username: string;
  displayName: string;
  avatar: string;
};

type DjUserPickerProps = {
  value: string;
  onChange: (username: string) => void;
  onSelect?: (dj: DjSearchResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export function DjUserPicker({
  value,
  onChange,
  onSelect,
  placeholder = "Search DJ username",
  className = "",
  disabled = false,
}: DjUserPickerProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DjSearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const query = value.trim().replace(/^@/, "");
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(() => {
      apiFetch(`/api/stations/owner/dj-search?q=${encodeURIComponent(query)}`)
        .then((r) => (r.ok ? r.json() : { djs: [] }))
        .then((data: { djs?: DjSearchResult[] }) => {
          const djs = data.djs ?? [];
          setResults(djs);
          setOpen(djs.length > 0);
          setActiveIndex(0);
        })
        .catch(() => {
          setResults([]);
          setOpen(false);
        })
        .finally(() => setLoading(false));
    }, 250);

    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function pick(dj: DjSearchResult) {
    onChange(dj.username);
    onSelect?.(dj);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(results[activeIndex]!);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/^@/, ""))}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm pr-8"
        />
        {loading && (
          <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-white/10 bg-[#141416] py-1 shadow-xl"
        >
          {results.map((dj, index) => (
            <li key={dj.username} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(dj)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                  index === activeIndex ? "bg-[#53fc18]/10 text-white" : "text-zinc-200 hover:bg-white/5"
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-bold">
                  {dj.avatar || dj.displayName.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium truncate">{dj.displayName}</span>
                  <span className="block text-xs text-zinc-500 truncate">@{dj.username}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && value.trim().length >= 2 && results.length === 0 && (
        <p className="absolute z-30 mt-1 w-full rounded-lg border border-white/10 bg-[#141416] px-3 py-2 text-xs text-zinc-500 shadow-xl">
          No DJ accounts found — they must sign up as Creator first.
        </p>
      )}
    </div>
  );
}
