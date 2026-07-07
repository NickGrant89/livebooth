import Link from "next/link";
import { Radio, Video } from "lucide-react";
import { StreamPageLayout } from "@/components/StreamPageLayout";

type Props = {
  djName: string;
  username: string;
  isHost: boolean;
};

export function StreamNotLiveView({ djName, username, isHost }: Props) {
  return (
    <StreamPageLayout
      watch={
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center min-h-[50vh]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 max-w-md w-full">
            <Radio className="h-10 w-10 text-zinc-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">{djName} isn&apos;t live yet</h1>
            <p className="text-sm text-zinc-400 mb-6">
              The booth page opens here once the host publishes their stream. Collab studio alone
              doesn&apos;t make the fan stream visible.
            </p>
            {isHost ? (
              <Link
                href="/go-live"
                className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm"
              >
                <Video className="h-4 w-4" />
                Go Live — publish your stream
              </Link>
            ) : (
              <Link
                href={`/dj/${username}`}
                className="text-[#53fc18] text-sm hover:underline"
              >
                Back to {djName}&apos;s profile
              </Link>
            )}
          </div>
        </div>
      }
      chat={
        <div className="hidden lg:flex flex-col flex-1 items-center justify-center px-6 text-center text-sm text-zinc-500 border-l border-white/[0.06]">
          Chat opens when the stream goes live.
        </div>
      }
    />
  );
}
