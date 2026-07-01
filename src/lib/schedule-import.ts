import { RADIO_TIERS, type RadioTierId } from "./constants";

export interface ParsedScheduleRow {
  djUsername: string;
  showTitle: string;
  slotDay: number | null;
  slotHour: number | null;
  slotLabel: string;
}

export interface ScheduleImportResult {
  rows: ParsedScheduleRow[];
  errors: string[];
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  fields.push(current.trim());
  return fields;
}

function parseDay(value: string): number | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const nameIdx = dayNames.findIndex((d) => trimmed.startsWith(d));
  if (nameIdx >= 0) return nameIdx;

  const num = parseInt(trimmed, 10);
  if (Number.isNaN(num) || num < 0 || num > 6) return null;
  return num;
}

function parseHour(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = parseInt(trimmed, 10);
  if (Number.isNaN(num) || num < 0 || num > 23) return null;
  return num;
}

export function parseStationScheduleCsv(csv: string): ScheduleImportResult {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const errors: string[] = [];
  const rows: ParsedScheduleRow[] = [];

  if (lines.length === 0) {
    return { rows, errors: ["CSV is empty"] };
  }

  let startIdx = 0;
  const firstFields = parseCsvLine(lines[0]).map((f) => f.toLowerCase());
  if (firstFields[0]?.includes("dj") || firstFields[0] === "username") {
    startIdx = 1;
  }

  for (let i = startIdx; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length < 1 || !fields[0]) {
      errors.push(`Line ${i + 1}: missing dj_username`);
      continue;
    }

    const djUsername = fields[0].replace(/^@/, "").toLowerCase();
    const showTitle = fields[1] ?? "";
    const slotDay = fields[2] != null ? parseDay(fields[2]) : null;
    const slotHour = fields[3] != null ? parseHour(fields[3]) : null;
    const slotLabel = fields[4] ?? "";

    if (fields[2] && slotDay === null) {
      errors.push(`Line ${i + 1}: invalid day "${fields[2]}" (use 0–6 or Mon–Sun)`);
    }
    if (fields[3] && slotHour === null) {
      errors.push(`Line ${i + 1}: invalid hour "${fields[3]}" (use 0–23 UTC)`);
    }

    rows.push({ djUsername, showTitle, slotDay, slotHour, slotLabel });
  }

  return { rows, errors };
}

export async function applyStationScheduleImport(
  stationId: string,
  rows: ParsedScheduleRow[],
  maxResidents: number,
) {
  const { prisma } = await import("./db");
  const applied: string[] = [];
  const skipped: string[] = [];

  const currentCount = await prisma.stationResident.count({ where: { stationId } });

  for (const row of rows) {
    const dj = await prisma.user.findUnique({ where: { username: row.djUsername } });
    if (!dj || (dj.role !== "dj" && dj.role !== "admin")) {
      skipped.push(`${row.djUsername}: not a DJ account`);
      continue;
    }

    const existing = await prisma.stationResident.findUnique({
      where: { stationId_djId: { stationId, djId: dj.id } },
    });

    if (!existing && currentCount + applied.length >= maxResidents) {
      skipped.push(`${row.djUsername}: resident limit reached`);
      continue;
    }

    await prisma.stationResident.upsert({
      where: { stationId_djId: { stationId, djId: dj.id } },
      create: {
        stationId,
        djId: dj.id,
        showTitle: row.showTitle,
        slotDay: row.slotDay,
        slotHour: row.slotHour,
        slotLabel: row.slotLabel || null,
      },
      update: {
        showTitle: row.showTitle,
        slotDay: row.slotDay,
        slotHour: row.slotHour,
        slotLabel: row.slotLabel || null,
      },
    });
    applied.push(row.djUsername);
  }

  return { applied, skipped };
}

export function stationAllowsEmbed(tier: string) {
  const meta = RADIO_TIERS[tier as RadioTierId] ?? RADIO_TIERS.community;
  return meta.relayMode || meta.whiteLabel;
}
