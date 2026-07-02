export default function VehicleLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
        <div className="skeleton aspect-[16/10] animate-shimmer rounded-md" />
        <div className="rounded-md bg-white p-6 shadow-panel">
          <div className="skeleton h-8 w-2/3 animate-shimmer rounded" />
          <div className="skeleton mt-6 h-10 w-1/2 animate-shimmer rounded" />
          <div className="mt-6 grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton h-20 animate-shimmer rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
