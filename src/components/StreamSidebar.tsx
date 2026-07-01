import { TopTippers } from "@/components/TopTippers";
import { ReportStreamButton } from "@/components/ReportStreamButton";
import { SetScorePanel } from "@/components/SetScorePanel";

interface Achievement {
  id: string;
  name: string;
  icon: string;
  tier: string;
}

export function StreamSidebar({
  achievements,
  streamId,
  className = "",
}: {
  achievements: Achievement[];
  streamId: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="p-4 border-b border-white/[0.06]">
        <SetScorePanel streamId={streamId} variant="fan" />
      </div>
      <TopTippers streamId={streamId} />
      {achievements.length > 0 && (
        <div className="border-t border-white/[0.06] p-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3">
            DJ Achievements
          </p>
          <div className="flex flex-wrap gap-2">
            {achievements.map((a) => (
              <span
                key={a.id}
                title={a.name}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] text-lg hover:border-[#53fc18]/30 transition-colors cursor-default"
              >
                {a.icon}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="border-t border-white/[0.06] px-4 pb-4">
        <ReportStreamButton streamId={streamId} />
      </div>
    </div>
  );
}
