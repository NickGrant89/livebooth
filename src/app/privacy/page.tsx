import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-zinc-500 text-sm mb-8">Last updated: June 2026</p>

      <section className="space-y-4 text-zinc-300 text-sm leading-relaxed">
        <p>
          {APP_NAME} (&quot;we&quot;) respects your privacy. This policy describes what we collect, why,
          and your choices.
        </p>

        <h2 className="text-lg font-bold text-white pt-4">Information we collect</h2>
        <ul className="list-disc list-inside space-y-1 text-zinc-400">
          <li>Account data: email, username, display name, password (hashed), profile bio and avatar</li>
          <li>Usage: streams watched, tips sent, chat messages, achievements, wallet ledger activity</li>
          <li>Technical: session cookies, push notification subscriptions, IP-derived logs (server)</li>
          <li>Optional: linked VeChain wallet address for on-chain tips and claims</li>
        </ul>

        <h2 className="text-lg font-bold text-white pt-4">How we use it</h2>
        <p>
          To operate the service — authentication, streaming, tipping, notifications, fraud prevention,
          moderation, and support. We do not sell personal data to third parties.
        </p>

        <h2 className="text-lg font-bold text-white pt-4">Sharing</h2>
        <p>
          We share data with infrastructure providers (hosting, streaming CDN, payment processors) only
          as needed to run {APP_NAME}. Public profile and stream information is visible to other users
          by design.
        </p>

        <h2 className="text-lg font-bold text-white pt-4">Retention &amp; deletion</h2>
        <p>
          We retain account data while your account is active. You may request deletion by contacting{" "}
          <a href="mailto:privacy@livebooth.uk" className="text-[#53fc18] hover:underline">
            privacy@livebooth.uk
          </a>
          . Some ledger and moderation records may be kept as required for legal or safety reasons.
        </p>

        <h2 className="text-lg font-bold text-white pt-4">Cookies</h2>
        <p>
          We use essential session cookies for login. Push notifications require browser permission and
          a service worker subscription stored on our servers.
        </p>

        <h2 className="text-lg font-bold text-white pt-4">Your rights</h2>
        <p>
          Depending on your region you may have rights to access, correct, or delete personal data.
          Contact us to exercise these rights.
        </p>

        <p className="pt-4">
          <Link href="/policies" className="text-[#53fc18] hover:underline">Policies &amp; procedures</Link>
          {" · "}
          <Link href="/terms" className="text-[#53fc18] hover:underline">Terms of Service</Link>
          {" · "}
          <Link href="/support" className="text-[#53fc18] hover:underline">Support</Link>
        </p>
      </section>
    </div>
  );
}
