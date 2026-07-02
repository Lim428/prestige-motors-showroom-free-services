export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="skeleton h-56 animate-shimmer rounded-md" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-md bg-white shadow-panel">
            <div className="skeleton h-56 animate-shimmer" />
            <div className="space-y-3 p-5">
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
