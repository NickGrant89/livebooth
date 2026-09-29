/** Instant feedback while server pages (force-dynamic) load on client navigation. */
export default function RootLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-20" aria-busy aria-label="Loading page">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-[#53fc18]"
        role="status"
      />
    </div>
  );
}
