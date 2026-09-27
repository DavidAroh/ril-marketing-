/** Loading placeholder that follows the Command Centre's masthead, wire,
 * assignment rail, and learning loop. */
export function DashboardSkeleton() {
  return (
    <div className="command-centre flex flex-1 flex-col gap-6 md:gap-8" aria-hidden>
      <header className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
          <div className="skeleton-sweep h-3 w-48 rounded" />
          <div className="skeleton-sweep h-3 w-36 rounded" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="skeleton-sweep h-9 w-80 max-w-full rounded" />
          <div className="skeleton-sweep h-4 w-[30rem] max-w-full rounded" />
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border border-y border-border sm:grid-cols-4 sm:divide-y-0">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2 px-4 py-3 sm:py-4">
              <div className="skeleton-sweep h-3 w-24 max-w-full rounded" />
              <div className="skeleton-sweep h-8 w-12 rounded" />
            </div>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.8fr)] xl:gap-6">
        <section className="slip overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
            <div className="skeleton-sweep h-6 w-48 rounded" />
            <div className="skeleton-sweep h-3 w-28 rounded" />
          </div>
          <div className="flex flex-col divide-y divide-border px-5 sm:px-6">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-5">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="skeleton-sweep h-3 w-28 rounded" />
                  <div className="skeleton-sweep h-4 w-3/4 max-w-full rounded" />
                  <div className="skeleton-sweep h-3 w-1/2 max-w-full rounded" />
                </div>
                <div className="skeleton-sweep h-9 w-20 shrink-0 rounded-md" />
              </div>
            ))}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="slip h-56 p-5">
            <div className="skeleton-sweep h-4 w-28 rounded" />
            <div className="mt-5 grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="skeleton-sweep h-12 rounded-md" />
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-3">
              <div className="skeleton-sweep h-4 w-full rounded" />
              <div className="skeleton-sweep h-4 w-full rounded" />
            </div>
          </div>
          <div className="slip h-40 p-5">
            <div className="skeleton-sweep h-4 w-28 rounded" />
            <div className="mt-5 flex flex-col gap-3">
              <div className="skeleton-sweep h-7 w-full rounded" />
              <div className="skeleton-sweep h-7 w-full rounded" />
            </div>
          </div>
        </aside>
      </div>

      <section className="slip overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5 sm:px-6">
          <div className="skeleton-sweep h-4 w-36 rounded" />
          <div className="skeleton-sweep h-3 w-32 rounded" />
        </div>
        <div className="flex flex-col divide-y divide-border px-5 sm:px-6">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="grid grid-cols-3 items-center gap-4 py-3">
              <div className="skeleton-sweep h-4 w-3/4 max-w-full rounded" />
              <div className="skeleton-sweep h-3 w-20 rounded" />
              <div className="skeleton-sweep ml-auto h-3 w-28 rounded" />
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="border-t border-border pt-4">
          <div className="skeleton-sweep h-5 w-40 rounded" />
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-6">
          <div className="slip h-64 p-5">
            <div className="skeleton-sweep h-4 w-36 rounded" />
            <div className="mt-5 flex flex-col gap-4">
              <div className="skeleton-sweep h-10 w-full rounded" />
              <div className="skeleton-sweep h-10 w-full rounded" />
              <div className="skeleton-sweep h-10 w-full rounded" />
            </div>
          </div>
          <div className="slip h-64 p-5">
            <div className="skeleton-sweep h-4 w-36 rounded" />
            <div className="mt-5 flex flex-col gap-4">
              <div className="skeleton-sweep h-10 w-full rounded" />
              <div className="skeleton-sweep h-10 w-full rounded" />
              <div className="skeleton-sweep h-10 w-full rounded" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
