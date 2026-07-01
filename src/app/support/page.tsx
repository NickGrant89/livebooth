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

const FAQ = [
  {
    category: "Account",
    items: [
      {
        q: "I forgot my password",
        a: "Use the password reset flow at /forgot-password — enter your email and follow the link. In local dev the reset URL appears on screen. Signed-in users can also change password in Settings.",
      },
      {
        q: "Can I change my username?",
        a: "Not yet. Usernames are permanent for now. You can change your display name and avatar anytime in Settings.",
      },
      {
        q: "Sign up button does nothing / form won't submit",
        a: "Usernames must be lowercase letters, numbers, and underscore only (e.g. digital89, not Digital89). The signup form auto-lowercases as you type. Also fill display name, email, and a password of at least 6 characters. If you see a red error after submitting, that message explains what failed (e.g. email already taken).",
      },
      {
        q: "What's the difference between fan and DJ accounts?",
        a: "Fans watch, tip, and unlock tracks. DJs can go live, earn DROP, and access the dashboard, collab, and stream tools. Station is a third role for radio channel owners.",
      },
    ],
  },
  {
    category: "Fans",
    items: [
      {
        q: "Why can't I hear the stream?",
        a: "Browsers block autoplay with sound. Click the player and tap 'Unmute' or 'Click to unmute'. Check your device volume and that the DJ is actually live (red LIVE badge).",
      },
      {
        q: "My tip didn't go through",
        a: "Check your wallet balance at /wallet. Tips require enough DROP. If balance is fine but it failed, refresh and try again. Dev mode uses an internal ledger — no real money.",
      },
      {
        q: "How do go-live notifications work?",
        a: "Follow a DJ for in-app alerts. For browser push, enable 'Go-live push alerts' in Settings or the notification bell menu. You must allow notifications in your browser.",
      },
      {
        q: "What is staking?",
        a: "Lock DROP on a DJ or radio station to show support. Station stakers share milestone rewards when the station hits follower/tip goals. Unstake anytime from the stake panel.",
      },
    ],
  },
  {
    category: "DJs",
    items: [
      {
        q: "OBS shows 'Failed to connect'",
        a: "Verify RTMP server URL and stream key from your dashboard. For local dev, run npm run rtmp:start. For production, set LIVEPEER_API_KEY. Keys are secret — don't share them.",
      },
      {
        q: "Fans see a demo stream, not my camera",
        a: "In dev without RTMP/Livepeer, a placeholder HLS plays until your encoder connects. Start OBS streaming with the correct key, wait ~10 seconds, and refresh the booth.",
      },
      {
        q: "When do I get paid?",
        a: "Tips, unlocks, and requests credit instantly to your in-app wallet. On-chain withdrawal via VeChain requires wallet connect and testnet/mainnet contract deploy (in progress).",
      },
      {
        q: "How does collab split work?",
        a: "Invite a partner on /collab before or during a stream. When collab is active, tips split by your agreed ratio (default 50/50). Station residencies use a separate 70/20/10 split.",
      },
    ],
  },
  {
    category: "Stations",
    items: [
      {
        q: "How do I start a radio station?",
        a: "Sign up at /signup and choose the Radio role — you'll get a setup wizard in Settings to name your channel and pick your public URL (/station/your-slug). Existing users: ask an admin to set your role to station, then open Settings.",
      },
      {
        q: "How do I add resident DJs?",
        a: "Sign in as station owner → Settings → Station dashboard. Add by username or import a CSV schedule. Residents must already have DJ accounts.",
      },
      {
        q: "Embed player doesn't load on my site",
        a: "Use the iframe snippet from your station dashboard. Embed requires Pro tier or higher. Ensure your site allows iframes from your LiveBooth domain.",
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
          href="mailto:support@livebooth.local?subject=LiveBooth%20Support"
          className="inline-flex items-center gap-2 rounded-xl bg-[#53fc18] px-5 py-2.5 text-sm font-bold text-black hover:opacity-90"
        >
          <Mail className="h-4 w-4" />
          support@livebooth.local
        </a>
        <p className="text-xs text-zinc-600 mt-3">
          Include your username, role (fan/DJ/station), and what you were doing when the issue occurred.
          We typically respond within 1–2 business days.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#141416] p-6 mb-10">
        <h2 className="font-bold text-white mb-2 flex items-center gap-2">
          <Wifi className="h-5 w-5 text-zinc-400" />
          Stream not working? Quick checks
        </h2>
        <ul className="text-sm text-zinc-400 space-y-2 mt-3 list-disc list-inside">
          <li>DJ: confirm OBS is streaming (green bitrate) and stream key matches dashboard</li>
          <li>Fan: click unmute on the player; try a hard refresh (Cmd+Shift+R)</li>
          <li>Dev: ensure <code className="text-xs bg-white/10 px-1 rounded">npm run dev:clean</code> is running on port 3008</li>
          <li>Dev RTMP: run <code className="text-xs bg-white/10 px-1 rounded">npm run rtmp:start</code> for local ingest</li>
        </ul>
      </section>

      <SupportTicketForm />

      <section>
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

      <p className="text-center text-xs text-zinc-600 mt-8">
        <Link href="/help" className="text-[#53fc18] hover:underline">
          ← Back to help center
        </Link>
      </p>
    </div>
  );
}
