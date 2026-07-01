"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";
import { DAY_LABELS } from "@/lib/constants";

export function ScheduleEditor() {
  const [day, setDay] = useState<number | "">("");
  const [hour, setHour] = useState<number | "">("");
  const [label, setLabel] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch("/api/schedule")
      .then((r) => r.json())
      .then((d) => {
        const s = d.schedule;
        if (s?.weeklySlotDay != null) setDay(s.weeklySlotDay);
        if (s?.weeklySlotHour != null) setHour(s.weeklySlotHour);
        setLabel(s?.weeklySlotLabel ?? "");
      });
  }, []);

  async function save() {
    const res = await apiFetch("/api/schedule", {
      method: "PATCH",
      body: JSON.stringify({
        weeklySlotDay: day === "" ? null : day,
        weeklySlotHour: hour === "" ? null : hour,
        weeklySlotLabel: label || null,
      }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <section className="rounded-xl border border-white/5 bg-[#141416] p-6 space-y-4">
      <h2 className="font-semibold text-sm text-zinc-400 uppercase tracking-wide flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        Weekly stream slot
      </h2>
      <p className="text-xs text-zinc-500">Fans see your schedule on your profile and home when you&apos;re not live.</p>
      <div className="grid sm:grid-cols-3 gap-3">
        <select
          value={day}
          onChange={(e) => setDay(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
          className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
        >
          <option value="">No day</option>
          {DAY_LABELS.map((d, i) => (
            <option key={d} value={i}>{d}</option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          max={23}
          value={hour}
          onChange={(e) => setHour(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
          placeholder="Hour UTC"
          className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Friday Night Techno"
          className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
        />
      </div>
      <button type="button" onClick={save} className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
        {saved ? "Saved ✓" : "Save schedule"}
      </button>
    </section>
  );
}
