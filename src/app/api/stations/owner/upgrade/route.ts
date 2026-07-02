import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { getTierMeta } from "@/lib/stations";

/** Beta: station owners can self-upgrade Community → Pro. Production billing TBD. */
export async function POST() {
  if (process.env.NEXT_PUBLIC_BETA_MODE !== "true") {
    return error(
      "Pro upgrades are handled through support — contact us to upgrade your station tier.",
      403,
    );
  }

  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const station = await prisma.radioStation.findUnique({ where: { ownerId: auth.id } });
  if (!station) return error("No station owned by this account", 404);

  if (station.tier !== "community") {
    return json({
      station: {
        tier: station.tier,
        tierMeta: getTierMeta(station.tier),
      },
      alreadyUpgraded: true,
    });
  }

  const updated = await prisma.radioStation.update({
    where: { id: station.id },
    data: { tier: "pro" },
  });

  return json({
    station: {
      tier: updated.tier,
      tierMeta: getTierMeta(updated.tier),
    },
    alreadyUpgraded: false,
  });
}
