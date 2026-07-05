"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch-client";

type Resident = {
  id: string;
  showTitle: string;
  dj: { username: string; displayName: string };
};

export function AdminStationResidents({
  stationId,
  stationSlug,
  onMsg,
}: {
  stationId: string;
  stationSlug: string;
  onMsg: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [djUsername, setDjUsername] = useState("");

  async function load() {
    const res = await apiFetch(`/api/admin/stations/residents?stationId=${encodeURIComponent(stationId)}`);
    if (res.ok) {
      const d = await res.json();
      setResidents(d.residents ?? []);
    }
  }

  useEffect(() => {
    if (open) void load();
  }, [open, stationId]);

  async function addResident(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiFetch("/api/admin/stations/residents", {
      method: "POST",
      body: JSON.stringify({ stationId, djUsername }),
    });
    if (res.ok) {
      onMsg(`Resident added to /${stationSlug}`);
      setDjUsername("");
      load();
    } else {
      const d = await res.json();
      onMsg(String(d.error ?? "Add failed"));
    }
  }

  async function removeResident(residentId: string) {
    if (!confirm("Remove this resident?")) return;
    const res = await apiFetch("/api/admin/stations/residents", {
      method: "DELETE",
      body: JSON.stringify({ stationId, residentId }),
    });
    if (res.ok) {
      onMsg("Resident removed");
      load();
    }
  }

  return (
    <div className="w-full mt-2">
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs text-[#53fc18] underline">
        {open ? "Hide residents" : "Manage residents"}
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-3 space-y-2">
          {residents.length === 0 ? (
            <p className="text-xs text-zinc-500">No residents yet.</p>
          ) : (
            residents.map((r) => (
              <div key={r.id} className="flex justify-between items-center text-xs">
                <span className="text-zinc-300">@{r.dj.username} {r.showTitle ? `· ${r.showTitle}` : ""}</span>
                <button type="button" onClick={() => removeResident(r.id)} className="text-red-400 underline">
                  Remove
                </button>
              </div>
            ))
          )}
          <form onSubmit={addResident} className="flex gap-2 pt-1">
            <input
              value={djUsername}
              onChange={(e) => setDjUsername(e.target.value)}
              placeholder="DJ username"
              className="flex-1 rounded bg-white/5 border border-white/10 px-2 py-1 text-xs"
            />
            <button type="submit" className="text-xs text-[#53fc18] underline shrink-0">Add</button>
          </form>
        </div>
      )}
    </div>
  );
}
