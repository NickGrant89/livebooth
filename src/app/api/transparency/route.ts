import { NextResponse } from "next/server";
import { getPublicEconomyStats } from "@/lib/public-economy";

export const revalidate = 300;

export async function GET() {
  const stats = await getPublicEconomyStats();
  return NextResponse.json(stats, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
