import { notFound } from "next/navigation";
import { EmbedPlayer } from "@/components/EmbedPlayer";
import { getStationBySlug, getLiveStreamForStation, getTierMeta } from "@/lib/stations";
import { stationAllowsEmbed } from "@/lib/schedule-import";
import { resolveLivePlaybackUrl } from "@/lib/streaming";

export const dynamic = "force-dynamic";

export default async function EmbedStationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const station = await getStationBySlug(slug);
  if (!station || !stationAllowsEmbed(station.tier)) notFound();

  const liveStream = await getLiveStreamForStation(station.id);
  const tierMeta = getTierMeta(station.tier);

  return (
    <EmbedPlayer
      stationName={station.name}
      stationSlug={station.slug}
      avatar={station.avatar}
      avatarUrl={station.avatarUrl}
      primaryColor={station.embedPrimaryColor}
      hideBranding={station.embedHideBranding && tierMeta.whiteLabel}
      playbackUrl={
        liveStream
          ? resolveLivePlaybackUrl(liveStream.status, liveStream.ingestKey, liveStream.playbackUrl)
          : null
      }
      streamTitle={liveStream?.title}
      djName={liveStream?.stationChannel ? station.name : liveStream?.dj.displayName}
      isLive={Boolean(liveStream)}
      relayUrl={station.relayUrl}
    />
  );
}
