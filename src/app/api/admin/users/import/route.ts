import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { json, error, isApiError } from "@/lib/api-utils";
import { requireAdminApi, logAdminAction } from "@/lib/admin";
import { getWelcomeBonus } from "@/lib/platform-settings";

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
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

export async function POST(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  const text = await request.text();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return error("Empty CSV", 400);

  const header = parseCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const hasHeader = header.includes("username") && header.includes("email");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const welcomeBonus = await getWelcomeBonus();
  const created: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const cols = parseCsvLine(dataLines[i]!);
    let username: string;
    let email: string;
    let displayName: string;
    let password: string;
    let role: string;

    if (hasHeader) {
      const row: Record<string, string> = {};
      header.forEach((h, idx) => {
        row[h] = cols[idx] ?? "";
      });
      username = row.username?.toLowerCase() ?? "";
      email = row.email?.toLowerCase() ?? "";
      displayName = row.displayname || row.display_name || row.name || username;
      password = row.password || "password123";
      role = row.role || "fan";
    } else {
      [username, email, displayName, password, role] = [
        cols[0]?.toLowerCase() ?? "",
        cols[1]?.toLowerCase() ?? "",
        cols[2] || cols[0] || "",
        cols[3] || "password123",
        cols[4] || "fan",
      ];
    }

    if (!username || !email || password.length < 6) {
      errors.push(`Line ${i + 1}: missing username, email, or short password`);
      continue;
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      errors.push(`Line ${i + 1}: invalid username ${username}`);
      continue;
    }
    if (!["fan", "dj", "station", "admin"].includes(role)) {
      errors.push(`Line ${i + 1}: invalid role ${role}`);
      continue;
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) {
      skipped.push(username);
      continue;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        username,
        email,
        displayName: displayName || username,
        passwordHash,
        role,
        avatar: (displayName || username).slice(0, 2).toUpperCase(),
        emailVerifiedAt: new Date(),
        balance: { create: { balance: welcomeBonus, totalEarned: 0 } },
      },
    });
    created.push(username);
  }

  await logAdminAction(
    admin.id,
    "users_import",
    "bulk",
    { created: created.length, skipped: skipped.length, errors: errors.length },
    request,
  );

  return json({ created, skipped, errors });
}
