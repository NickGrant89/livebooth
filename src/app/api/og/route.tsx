import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "live";
  const dj = searchParams.get("dj") ?? "DJ";
  const title = searchParams.get("title") ?? "Live set";
  const username = searchParams.get("username") ?? "";
  const live = searchParams.get("live") === "1";
  const tips = searchParams.get("tips");
  const peak = searchParams.get("peak");

  const grade = searchParams.get("grade");
  const score = searchParams.get("score");
  const contribution = searchParams.get("contribution");
  const timestamp = searchParams.get("timestamp");

  const isClip = type === "clip";
  const isLive = type === "live" || (type === "profile" && live);
  const badge =
    isLive ? "🔴 LIVE"
    : type === "grade" ? `GRADE ${grade ?? "?"}`
    : type === "vod" ? "▶ REPLAY"
    : type === "recap" ? "✓ SET COMPLETE"
    : type === "clip" ? "🎬 CLIP"
    : type === "station" ? "📻 RADIO"
    : "DJ";

  const size = isClip ? { width: 1080, height: 1920 } : { width: 1200, height: 630 };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: isClip ? 72 : 56,
          background: "linear-gradient(135deg, #030304 0%, #0a1628 50%, #030304 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "linear-gradient(135deg, #53fc18, #15CFF4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                fontWeight: 800,
                color: "#000",
              }}
            >
              LB
            </div>
            <span style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>LiveBooth</span>
          </div>
          <div
            style={{
              padding: "8px 20px",
              borderRadius: 999,
              background: isLive ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)",
              border: isLive ? "2px solid rgba(239,68,68,0.5)" : "2px solid rgba(255,255,255,0.15)",
              color: isLive ? "#fca5a5" : "#a1a1aa",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            {badge}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {type === "grade" && grade && (
            <div style={{ fontSize: 120, fontWeight: 900, color: "#53fc18", lineHeight: 1 }}>
              {grade}
            </div>
          )}
          <div style={{ fontSize: type === "grade" ? 36 : isClip ? 64 : 52, fontWeight: 800, color: "#fff", lineHeight: 1.1, maxWidth: 900 }}>
            {type === "grade" ? `Grade ${grade} set` : dj}
          </div>
          <div style={{ fontSize: isClip ? 40 : 32, color: "#a1a1aa", lineHeight: 1.2, maxWidth: 900 }}>
            {type === "grade" ? dj : title}
          </div>
          {isClip && timestamp && (
            <div style={{ fontSize: 36, color: "#15CFF4", fontWeight: 700, fontFamily: "monospace" }}>
              @ {timestamp}
            </div>
          )}
          {(tips || peak || score || contribution) && (
            <div style={{ display: "flex", gap: 24, marginTop: 8, flexWrap: "wrap" }}>
              {score && (
                <span style={{ fontSize: 24, color: "#15CFF4", fontWeight: 600 }}>{score} pts</span>
              )}
              {contribution && (
                <span style={{ fontSize: 24, color: "#53fc18", fontWeight: 600 }}>+{contribution} your impact</span>
              )}
              {tips && (
                <span style={{ fontSize: 24, color: "#53fc18", fontWeight: 600 }}>{tips} DROP tipped</span>
              )}
              {peak && (
                <span style={{ fontSize: 24, color: "#15CFF4", fontWeight: 600 }}>{peak} peak</span>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 22, color: "#71717a" }}>Tip the drop · DROP on VeChain</span>
          {username && (
            <span style={{ fontSize: 20, color: "#52525b", fontFamily: "monospace" }}>@{username}</span>
          )}
        </div>
      </div>
    ),
    size,
  );
}
