import { DAY_LABELS } from "./constants";

/** Human-readable next weekly stream slot (UTC). */
export function formatNextWeeklySlot(
  day: number,
  hour: number,
  label?: string | null,
  now = new Date(),
): string {
  const slotName = label?.trim() || "Weekly set";
  const dayName = DAY_LABELS[day] ?? "Day";

  const currentDay = now.getUTCDay();
  const currentHour = now.getUTCHours();

  let daysUntil = (day - currentDay + 7) % 7;
  if (daysUntil === 0 && currentHour >= hour) daysUntil = 7;

  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntil, hour, 0, 0),
  );
  const diffMs = Math.max(0, next.getTime() - now.getTime());
  const diffHours = Math.round(diffMs / 3_600_000);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 0 && diffHours <= 1) {
    return `${slotName} — ${dayName} ${hour}:00 UTC (starting soon)`;
  }
  if (diffDays === 0) {
    return `${slotName} — ${dayName} ${hour}:00 UTC (in ~${diffHours}h)`;
  }
  if (diffDays === 1) {
    return `${slotName} — tomorrow ${dayName} ${hour}:00 UTC`;
  }
  if (diffDays < 7) {
    return `${slotName} — ${dayName} ${hour}:00 UTC (in ${diffDays} days)`;
  }
  return `${slotName} — every ${dayName} ${hour}:00 UTC`;
}
