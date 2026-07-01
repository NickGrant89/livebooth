import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-6xl font-bold text-[#53fc18] mb-4">404</h1>
      <h2 className="text-xl font-semibold mb-2">Page not found</h2>
      <p className="text-zinc-400 mb-6">
        This DJ or stream doesn&apos;t exist, or they&apos;re not live right now.
      </p>
      <Link
        href="/"
        className="inline-block rounded-lg bg-[#53fc18] px-6 py-2 text-sm font-bold text-black hover:opacity-90 transition-opacity"
      >
        Back to Browse
      </Link>
    </div>
  );
}
