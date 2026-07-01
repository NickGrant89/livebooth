import { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Headphones, Radio, Building2 } from "lucide-react";

export type GuideSectionLink = { id: string; title: string };

export function HelpGuideLayout({
  title,
  subtitle,
  backHref,
  role,
  sections,
  children,
}: {
  title: string;
  subtitle: string;
  backHref: string;
  role: "fan" | "dj" | "station";
  sections?: GuideSectionLink[];
  children: ReactNode;
}) {
  const Icon = role === "dj" ? Radio : role === "station" ? Building2 : Headphones;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-16">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Help center
      </Link>

      <div className="flex items-start gap-4 mb-8">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#53fc18]/10 border border-[#53fc18]/30">
          <Icon className="h-7 w-7 text-[#53fc18]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">{title}</h1>
          <p className="text-zinc-400 mt-1">{subtitle}</p>
        </div>
      </div>

      {sections && sections.length > 0 && (
        <nav
          aria-label="On this page"
          className="mb-10 rounded-2xl border border-white/10 bg-white/[0.02] p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
            On this page
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-sm text-zinc-400 hover:text-[#53fc18] transition-colors"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="space-y-10">{children}</div>

      <div className="mt-12 pt-8 border-t border-white/10">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-3">
          More guides
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/help/fans" className="text-zinc-500 hover:text-[#53fc18]">
            Fan guide →
          </Link>
          <Link href="/help/djs" className="text-zinc-500 hover:text-[#53fc18]">
            DJ guide →
          </Link>
          <Link href="/help/stations" className="text-zinc-500 hover:text-[#53fc18]">
            Station guide →
          </Link>
          <Link href="/support" className="text-zinc-500 hover:text-[#53fc18]">
            Support & FAQ →
          </Link>
        </div>
      </div>
    </div>
  );
}

export function GuideSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-lg font-bold text-white mb-4 pb-2 border-b border-white/10">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function GuideStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-[#53fc18]">
        {n}
      </span>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-zinc-200 mb-1">{title}</h3>
        <div className="text-sm text-zinc-400 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
