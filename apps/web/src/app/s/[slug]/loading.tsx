/** Skeleton while the gallery loads. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="skeleton h-9 w-2/3" />
      <div className="skeleton h-12 w-full" />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="flex flex-col gap-2">
            <div className="skeleton aspect-square w-full" />
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
          </li>
        ))}
      </ul>
    </div>
  );
}
