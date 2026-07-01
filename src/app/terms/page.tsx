import Link from "next/link";
import { APP_NAME, DROP_TOKEN_SYMBOL } from "@/lib/constants";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 prose prose-invert prose-sm">
      <h1 className="text-3xl font-bold text-white not-prose mb-2">Terms of Service</h1>
      <p className="text-zinc-500 not-prose text-sm mb-8">Last updated: June 2026</p>

      <section className="space-y-4 text-zinc-300 text-sm leading-relaxed">
        <p>
          Welcome to {APP_NAME}. By using our platform you agree to these terms. {APP_NAME} provides
          live DJ streaming, chat, and a virtual tipping economy using {DROP_TOKEN_SYMBOL} tokens.
        </p>

        <h2 className="text-lg font-bold text-white pt-4">Accounts</h2>
        <p>
          You must provide accurate information when signing up. You are responsible for your account
          credentials. We may suspend accounts that violate these terms, applicable law, or community
          guidelines — including streaming infringing, illegal, or harmful content.
        </p>

        <h2 className="text-lg font-bold text-white pt-4">Content &amp; streaming</h2>
        <p>
          DJs retain ownership of their performances but grant {APP_NAME} a license to host, transmit,
          and display streams on the platform. You must have rights to all music and media you broadcast.
          Do not stream content that is unlawful, harassing, sexually exploitative, or that infringes
          copyright. Viewers may report streams; repeated or serious violations result in termination.
        </p>

        <h2 className="text-lg font-bold text-white pt-4">{DROP_TOKEN_SYMBOL} &amp; payments</h2>
        <p>
          {DROP_TOKEN_SYMBOL} is a platform utility token for tips, unlocks, and in-app features — not
          an investment product. Purchases and tips are generally non-refundable except where required by
          law. Platform fees apply as disclosed at checkout and in the DJ dashboard. On-chain features
          are subject to blockchain network conditions.
        </p>

        <h2 className="text-lg font-bold text-white pt-4">Moderation</h2>
        <p>
          We may remove content, end live streams, or restrict accounts without prior notice when
          necessary to protect users or comply with law. Automated and manual moderation tools may be
          used, including viewer reports and stream health checks.
        </p>

        <h2 className="text-lg font-bold text-white pt-4">Limitation of liability</h2>
        <p>
          {APP_NAME} is provided &quot;as is.&quot; We are not liable for indirect damages, lost profits,
          or issues arising from third-party services (encoders, payment processors, blockchains).
        </p>

        <h2 className="text-lg font-bold text-white pt-4">Contact</h2>
        <p>
          Questions:{" "}
          <a href="mailto:legal@livebooth.local" className="text-[#53fc18] hover:underline">
            legal@livebooth.local
          </a>
          {" · "}
          <Link href="/support" className="text-[#53fc18] hover:underline">Support</Link>
        </p>
      </section>
    </div>
  );
}
