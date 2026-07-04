"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  HelpCircle,
  Mail,
  MessageCircle,
  ChevronDown,
  Headphones,
  Radio,
  Wallet,
  Wifi,
  Send,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { SUPPORT_CATEGORIES } from "@/lib/constants";

const RTMP_SERVER = "rtmp://rtmp.livebooth.uk:1935/live";

const FAQ = [
  {
    category: "Account",
    items: [
      {
        q: "I forgot my password",
        a: "Use /forgot-password — enter your email and follow the reset link in your inbox. Signed-in users can also change password in Settings.",
      },
      {
        q: "Can I change my username?",
        a: "Not yet. Usernames are permanent for now. You can change your display name, bio, and avatar anytime in Settings.",
      },
      {
        q: "Sign up button does nothing / form won't submit",
        a: "Usernames must be lowercase letters, numbers, and underscore only (e.g. digital89). Fill display name, email, and a password of at least 6 characters. Red error text after submit explains what failed (e.g. email already taken).",
      },
      {
        q: "What's the difference between fan and DJ accounts?",
        a: "Fans watch, tip, unlock tracks, and stake on DJs. DJs can go live, earn DROP, and use the dashboard, collab, and stream tools. Radio is a third role for station owners.",
      },
    ],
  },
  {
    category: "Fans",
    items: [
      {
        q: "Why can't I hear the stream?",
        a: "Browsers block autoplay with sound. Click the player and tap Unmute. Check device volume and that the DJ is live (red LIVE badge on Discover or their profile).",
      },
      {
        q: "My tip didn't go through",
        a: "Check your wallet balance at /wallet. Tips require enough DROP. Refresh the page and try again. For on-chain tips, ensure your wallet is connected and has enough on-chain DROP.",
      },
      {
        q: "How do go-live notifications work?",
        a: "Follow a DJ for in-app alerts. For browser push, enable Go-live push alerts in Settings or the notification bell. You must allow notifications in your browser when prompted.",
      },
      {
        q: "What is staking?",
        a: "Lock DROP on a DJ or radio station to show support. Station stakers share milestone rewards when the station hits follower and tip goals. Unstake anytime from the stake panel on a profile.",
      },
      {
        q: "How do I buy more DROP?",
        a: "Open /wallet and choose a DROP pack. Checkout is handled by Stripe. You can also earn DROP from daily login, achievements, and quests.",
      },
    ],
  },
  {
    category: "DJs — streaming",
    items: [
      {
        q: "OBS shows 'Failed to connect'",
        a: `Verify Server is ${RTMP_SERVER} and Stream key matches Go Live exactly. Do not put the key in the server URL. Check your firewall allows outbound port 1935. Try Stop Streaming → paste key again → Start Streaming.`,
      },
      {
        q: "OBS looks connected but preview shows no video",
        a: "This usually means the stream key in OBS doesn't match the current Go Live session. Click Stop Streaming in OBS, copy the key from Go Live again, Start Streaming, and wait for 'Signal detected'. The status bar must show a bitrate (e.g. 2500 kbps), not just Connected.",
      },
      {
        q: "Preview says 'Waiting for OBS signal'",
        a: "The server hasn't received your RTMP feed on that stream key yet. Confirm Start Streaming (not Preview only), key matches, and you started a new OBS session after creating a new Go Live stream. See /help/djs for the full OBS checklist.",
      },
      {
        q: "I cancelled preview but fans saw me live",
        a: "Use Cancel setup — don't publish on the preview step to discard without notifying followers. Only click 'Looks good — go live' when you're ready. End stream from Go Live or the dashboard when finished.",
      },
      {
        q: "When do I get paid?",
        a: "Tips, unlocks, and requests credit instantly to your in-app wallet. On-chain tips go to your linked VeChain wallet. Fiat cash-out is requested from /wallet and processed after admin approval.",
      },
      {
        q: "How does collab split work?",
        a: "Invite a partner on /collab. When collab is active, tips split by your agreed ratio. Station residencies use a separate DJ/station/platform split — see /help/stations.",
      },
    ],
  },
  {
    category: "Wallet & on-chain",
    items: [
      {
        q: "How do on-chain tips work?",
        a: "Connect VeWorld or create an embedded wallet via email at /wallet. During a live stream, enable the on-chain tip toggle in chat. DJs must link a wallet on their profile to receive on-chain tips.",
      },
      {
        q: "What is DROP on-chain vs in-app?",
        a: "In-app DROP is your platform balance for tips, unlocks, and requests. On-chain DROP is the VeChain testnet token — used for wallet tips and achievement claims when your wallet is connected.",
      },
      {
        q: "How do I add DROP to VeWorld?",
        a: "Open /wallet, connect your wallet, and copy the DROP token contract address shown on the page. In VeWorld: Manage Tokens → Custom → paste the contract (VeChain Testnet).",
      },
    ],
  },
  {
    category: "Stations",
    items: [
      {
        q: "How do I start a radio station?",
        a: "Sign up at /signup and choose the Radio role — you'll get a setup wizard in Settings. Existing users: ask an admin to set your role to station, then open Settings.",
      },
      {
        q: "How do I add resident DJs?",
        a: "Sign in as station owner → Settings → Station dashboard. Add by username or import a CSV schedule. Residents must already have DJ accounts on LiveBooth.",
      },
      {
        q: "Embed player doesn't load on my site",
        a: "Use the iframe snippet from your station dashboard. Embed requires Pro tier or higher. Ensure your site allows iframes from livebooth.uk.",
      },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-medium text-zinc-200 hover:text-white"
      >
        {q}
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="pb-4 text-sm text-zinc-400 leading-relaxed">{a}</p>}
    </div>
  );
}

function SupportTicketForm() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [category, setCategory] = useState("other");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await apiFetch("/api/support/tickets", {
      method: "POST",
      body: JSON.stringify({ email, category, subject, body }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not submit");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className="text-sm text-[#53fc18] border border-[#53fc18]/30 rounded-xl p-4">
        Ticket submitted — we&apos;ll reply to {email}.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-[#141416] p-6 space-y-4">
      <h2 className="font-bold text-white flex items-center gap-2">
        <Send className="h-4 w-4 text-[#53fc18]" />
        Submit a support ticket
      </h2>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="Your email"
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
      >
        {SUPPORT_CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        required
        maxLength={120}
        placeholder="Subject"
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        minLength={10}
        rows={4}
        placeholder="Describe your issue…"
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm resize-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-[#53fc18] px-5 py-2.5 text-sm font-bold text-black disabled:opacity-50 flex items-center gap-2"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit ticket
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-10">
        <HelpCircle className="h-8 w-8 text-[#53fc18] mb-3" />
        <h1 className="text-3xl font-bold text-white">Support</h1>
        <p className="text-zinc-400 mt-2">FAQs and ways to reach us for fans, DJs, and station owners.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { icon: Headphones, label: "Fan guide", href: "/help/fans" },
          { icon: Radio, label: "DJ guide", href: "/help/djs" },
          { icon: Wifi, label: "Station guide", href: "/help/stations" },
          { icon: Wallet, label: "Wallet & DROP", href: "/wallet" },
        ].map(({ icon: Icon, label, href }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-[#53fc18]/30 transition-colors"
          >
            <Icon className="h-5 w-5 text-[#53fc18]" />
            <span className="text-sm font-medium text-zinc-300">{label}</span>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-[#53fc18]/20 bg-[#53fc18]/5 p-6 mb-10">
        <h2 className="font-bold text-white mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-[#53fc18]" />
          Contact support
        </h2>
        <p className="text-sm text-zinc-400 mb-4">
          For bugs, account issues, payout questions, or partnership inquiries:
        </p>
        <a
          href="mailto:support@livebooth.uk?subject=LiveBooth%20Support"
          className="inline-flex items-center gap-2 rounded-xl bg-[#53fc18] px-5 py-2.5 text-sm font-bold text-black hover:opacity-90"
        >
          <Mail className="h-4 w-4" />
          support@livebooth.uk
        </a>
        <p className="text-xs text-zinc-600 mt-3">
          Include your username, role (fan/DJ/station), and what you were doing when the issue occurred.
          We typically respond within 1–2 business days.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#141416] p-6 mb-10">
        <h2 className="font-bold text-white mb-2 flex items-center gap-2">
          <Wifi className="h-5 w-5 text-zinc-400" />
          Stream not working? Quick checks (DJs)
        </h2>
        <ol className="text-sm text-zinc-400 space-y-2 mt-3 list-decimal list-inside">
          <li>
            Server: <code className="text-xs bg-white/10 px-1 rounded">{RTMP_SERVER}</code> — stream key in the{" "}
            <strong className="text-zinc-300">Stream key</strong> field only
          </li>
          <li>Click <strong className="text-zinc-300">Stop Streaming</strong>, paste the current key from Go Live, then{" "}
            <strong className="text-zinc-300">Start Streaming</strong>
          </li>
          <li>OBS status bar must show a <strong className="text-zinc-300">bitrate</strong> (e.g. 2500 kbps), not just Connected</li>
          <li>Wait for <strong className="text-zinc-300">Signal detected</strong> on the Go Live preview step before going live</li>
          <li>Fans: click <strong className="text-zinc-300">Unmute</strong> on the player; hard refresh (Cmd+Shift+R) if stuck</li>
        </ol>
        <p className="text-xs text-zinc-600 mt-4">
          Full walkthrough: <Link href="/help/djs#obs" className="text-[#53fc18] hover:underline">DJ guide → OBS setup</Link>
          {" · "}
          <Link href="/policies#djs" className="text-[#53fc18] hover:underline">Go-live procedures</Link>
        </p>
      </section>

      <SupportTicketForm />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-zinc-400" />
          Frequently asked questions
        </h2>
        {FAQ.map((section) => (
          <div key={section.category} className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2">
              {section.category}
            </h3>
            <div className="rounded-xl border border-white/10 bg-[#141416] px-4">
              {section.items.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <p className="text-center text-xs text-zinc-600 mt-8 space-x-3">
        <Link href="/help" className="text-[#53fc18] hover:underline">
          ← Help center
        </Link>
        <Link href="/policies" className="text-[#53fc18] hover:underline">
          Policies
        </Link>
        <Link href="/roadmap" className="text-[#53fc18] hover:underline">
          Roadmap
        </Link>
      </p>
    </div>
  );
}
