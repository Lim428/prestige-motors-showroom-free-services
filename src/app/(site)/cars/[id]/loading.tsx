export default function VehicleLoading() {
  return (
    <main
      aria-label="Loading vehicle details"
      aria-busy="true"
      className="pb-32 sm:pb-16"
    >
      <p className="sr-only" role="status">
        Loading vehicle details.
      </p>
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-5 sm:px-6 sm:pt-8 lg:px-8">
        <div className="skeleton h-5 w-40 animate-shimmer rounded-full" />

        <div className="mt-7 flex flex-col gap-6 border-b border-ink/10 pb-7 sm:mt-10 sm:flex-row sm:items-end sm:justify-between sm:pb-9">
          <div className="w-full max-w-3xl">
            <div className="skeleton h-5 w-40 animate-shimmer rounded-full" />
            <div className="skeleton mt-5 h-12 w-4/5 animate-shimmer rounded-xl sm:h-16" />
            <div className="skeleton mt-4 h-4 w-64 max-w-full animate-shimmer rounded-full" />
          </div>
          <div className="w-full sm:w-60">
            <div className="skeleton h-4 w-24 animate-shimmer rounded-full sm:ml-auto" />
            <div className="skeleton mt-3 h-12 w-52 animate-shimmer rounded-xl sm:ml-auto" />
          </div>
        </div>

        <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.65fr)] lg:gap-10">
          <div>
            <div className="skeleton aspect-[4/3] animate-shimmer rounded-[1.5rem] sm:aspect-[16/10]" />
            <div className="mt-4 flex gap-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="skeleton aspect-[4/3] w-24 shrink-0 animate-shimmer rounded-xl"
                />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-panel">
              <div className="bg-ink p-6">
                <div className="h-4 w-28 rounded-full bg-white/15" />
                <div className="mt-4 h-7 w-4/5 rounded-lg bg-white/15" />
                <div className="mt-3 h-4 w-full rounded-full bg-white/10" />
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="skeleton h-14 animate-shimmer rounded-lg" />
                  ))}
                </div>
                <div className="skeleton mt-6 h-12 animate-shimmer rounded-xl" />
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-white p-6 shadow-panel">
              <div className="skeleton h-5 w-28 animate-shimmer rounded-full" />
              <div className="skeleton mt-4 h-8 w-4/5 animate-shimmer rounded-lg" />
              <div className="mt-6 grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="skeleton h-12 animate-shimmer rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="skeleton mt-10 h-56 animate-shimmer rounded-[1.5rem]" />
      </div>

      <div
        aria-hidden="true"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:hidden"
      >
        <div className="flex items-center gap-3">
          <div className="skeleton h-9 min-w-0 flex-1 animate-shimmer rounded-lg" />
          <div className="skeleton h-11 w-20 animate-shimmer rounded-xl" />
          <div className="skeleton h-11 w-24 animate-shimmer rounded-xl" />
        </div>
      </div>
    </main>
  );
}
