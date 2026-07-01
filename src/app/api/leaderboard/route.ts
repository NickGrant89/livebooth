import { json } from "@/lib/api-utils";
import { getLeaderboardData } from "@/lib/leaderboard";

export async function GET() {
  const data = await getLeaderboardData();
  return json(data);
}
