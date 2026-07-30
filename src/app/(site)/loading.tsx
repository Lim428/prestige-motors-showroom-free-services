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
      <div className="skeleton h-[380px] animate-shimmer rounded-3xl" />
      <div className="skeleton mt-6 h-28 animate-shimmer rounded-2xl" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl bg-white shadow-panel">
            <div className="skeleton aspect-[16/10] animate-shimmer" />
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
