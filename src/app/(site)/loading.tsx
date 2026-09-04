export default function Loading() {
  return (
    <main
      className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Loading showroom"
    >
      <p className="sr-only" role="status">
        Loading the showroom.
      </p>
      <div className="skeleton h-[520px] animate-shimmer" />
      <div className="skeleton mt-0 h-28 animate-shimmer border-y border-ink/10" />
      <div className="mt-8 divide-y divide-ink/15 border-y border-ink/15">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="grid overflow-hidden bg-white sm:grid-cols-[34%_1fr]">
            <div className="skeleton aspect-[16/8] animate-shimmer sm:aspect-auto" />
            <div className="space-y-3 p-6">
              <div className="skeleton h-5 w-2/3 animate-shimmer rounded" />
              <div className="skeleton h-4 w-full animate-shimmer rounded" />
              <div className="skeleton h-4 w-4/5 animate-shimmer rounded" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
