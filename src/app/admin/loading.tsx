export default function AdminLoading() {
  return (
    <main
      id="admin-content"
      aria-busy="true"
      aria-labelledby="admin-loading-label"
      className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8"
    >
      <p id="admin-loading-label" className="sr-only">
        Loading dealership operations
      </p>
      <div className="skeleton h-16 w-full animate-shimmer rounded-md" />
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton h-24 animate-shimmer rounded-md" />
        ))}
      </div>
      <div className="skeleton mt-5 h-14 animate-shimmer rounded-md" />
      <div className="skeleton mt-4 h-[34rem] animate-shimmer rounded-md" />
    </main>
  );
}
