import Link from "next/link";
import { APP_NAME, DROP_TOKEN_SYMBOL } from "@/lib/constants";

export default function PoliciesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-white mb-2">Policies &amp; procedures</h1>
      <p className="text-zinc-500 text-sm mb-8">Last updated: July 2026</p>

      <nav className="flex flex-wrap gap-2 mb-10">
        {[
          { href: "#policies", label: "Platform policies" },
          { href: "#community", label: "Community guidelines" },
          { href: "#djs", label: "DJ procedures" },
          { href: "#fans", label: "Fan procedures" },
          { href: "#moderation", label: "Moderation" },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 hover:bg-white/10"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <section id="policies" className="space-y-4 text-zinc-300 text-sm leading-relaxed mb-12">
        <h2 className="text-xl font-bold text-white">Platform policies</h2>
        <p>
          {APP_NAME} is governed by our legal terms and privacy commitments. All users must comply with
          applicable law and these policies when streaming, tipping, or interacting on the platform.
        </p>
        <ul className="list-disc list-inside space-y-1 text-zinc-400">
          <li>
            <Link href="/terms" className="text-[#53fc18] hover:underline">Terms of Service</Link> — accounts,
            content licensing, {DROP_TOKEN_SYMBOL}, liability
          </li>
          <li>
            <Link href="/privacy" className="text-[#53fc18] hover:underline">Privacy Policy</Link> — data we
            collect, cookies, wallet linking, retention
          </li>
        </ul>
      </section>

      <section id="community" className="space-y-4 text-zinc-300 text-sm leading-relaxed mb-12">
        <h2 className="text-xl font-bold text-white">Community guidelines</h2>
        <p>Everyone on {APP_NAME} must:</p>
        <ul className="list-disc list-inside space-y-2 text-zinc-400">
          <li>Treat DJs, fans, and moderators with respect — no harassment, hate speech, or doxing</li>
          <li>Only stream content you have rights to — licensed music, original sets, or rights-cleared media</li>
          <li>Not stream illegal activity, sexual content involving minors, or gratuitous violence</li>
          <li>Not use bots, tip fraud, or exploits against the {DROP_TOKEN_SYMBOL} ledger or on-chain contracts</li>
          <li>Report problematic streams or chat via in-app report tools</li>
        </ul>
        <p>
          Violations may result in stream termination, account suspension, or permanent ban without refund of
          virtual balances where permitted by law.
        </p>
      </section>

      <section id="djs" className="space-y-4 text-zinc-300 text-sm leading-relaxed mb-12">
        <h2 className="text-xl font-bold text-white">DJ procedures</h2>
        <h3 className="text-base font-semibold text-white">Going live</h3>
        <ol className="list-decimal list-inside space-y-2 text-zinc-400">
          <li>Create a stream on <Link href="/go-live" className="text-[#53fc18] hover:underline">Go Live</Link> — this generates your RTMP server URL and stream key</li>
          <li>Configure OBS: Settings → Stream → Custom. Paste server URL and stream key in separate fields</li>
          <li>Wait for preview checks — signal must be detected before fans are notified</li>
          <li>Click &quot;Looks good — go live&quot; only when audio and video look correct</li>
          <li>Use &quot;Cancel setup — don&apos;t publish&quot; to discard a preview without notifying followers</li>
          <li>End your stream from Go Live or the dashboard when finished — replays appear in your archive</li>
        </ol>
        <h3 className="text-base font-semibold text-white">Earning {DROP_TOKEN_SYMBOL}</h3>
        <ul className="list-disc list-inside space-y-1 text-zinc-400">
          <li>In-app tips credit your ledger balance immediately</li>
          <li>Link a VeChain wallet in <Link href="/wallet" className="text-[#53fc18] hover:underline">Wallet</Link> to receive on-chain tips during live sets</li>
          <li>Platform fee applies to tips and unlocks — see dashboard for your share</li>
        </ul>
        <p>
          Full setup guide: <Link href="/help/djs" className="text-[#53fc18] hover:underline">DJ help centre</Link>
        </p>
      </section>

      <section id="fans" className="space-y-4 text-zinc-300 text-sm leading-relaxed mb-12">
        <h2 className="text-xl font-bold text-white">Fan procedures</h2>
        <ul className="list-disc list-inside space-y-2 text-zinc-400">
          <li>Follow DJs for go-live alerts — enable push in Settings</li>
          <li>Tip with in-app {DROP_TOKEN_SYMBOL} or connect a wallet for on-chain tips on live streams</li>
          <li>Track unlocks and requests spend {DROP_TOKEN_SYMBOL} — purchases are non-refundable except where required by law</li>
          <li>Report streams or chat messages that violate community guidelines</li>
        </ul>
        <p>
          Fan guide: <Link href="/help/fans" className="text-[#53fc18] hover:underline">Fan help centre</Link>
        </p>
      </section>

      <section id="moderation" className="space-y-4 text-zinc-300 text-sm leading-relaxed">
        <h2 className="text-xl font-bold text-white">Moderation &amp; safety</h2>
        <p>
          {APP_NAME} uses a combination of user reports, admin review, and automated health checks. DJs may
          ban users from their chat. Platform admins may end streams, remove archives, and suspend accounts.
        </p>
        <p>
          For urgent safety issues or appeals, contact{" "}
          <a href="mailto:support@livebooth.uk" className="text-[#53fc18] hover:underline">
            support@livebooth.uk
          </a>{" "}
          or start <Link href="/support" className="text-[#53fc18] hover:underline">live support chat</Link> on
          Support (each chat is logged as a ticket).
        </p>
      </section>
    </div>
  );
}
