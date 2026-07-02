export default function AdminLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="skeleton h-20 w-full animate-shimmer rounded-md" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton h-28 animate-shimmer rounded-md" />
        ))}
      </div>
      <div className="skeleton mt-8 h-96 animate-shimmer rounded-md" />
    </main>
  );
}
