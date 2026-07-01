import { prisma } from "@/lib/db";
import { json, isApiError } from "@/lib/api-utils";
import { requireAdminApi } from "@/lib/admin";

export async function GET(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  const limit = Math.min(
    200,
    Math.max(1, Number(new URL(request.url).searchParams.get("limit") ?? 100)),
  );

  const logs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      admin: { select: { username: true, displayName: true } },
    },
  });

  return json({
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      target: log.target,
      metadata: (() => {
        try {
          return JSON.parse(log.metadata) as Record<string, unknown>;
        } catch {
          return {};
        }
      })(),
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
      admin: log.admin,
    })),
  });
}
