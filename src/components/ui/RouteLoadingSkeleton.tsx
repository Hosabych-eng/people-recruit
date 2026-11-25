type RouteLoadingSkeletonProps = {
  variant?: "board" | "table" | "profile" | "list";
};

export function RouteLoadingSkeleton({
  variant = "board",
}: RouteLoadingSkeletonProps) {
  if (variant === "table") {
    return (
      <div className="flex min-h-full flex-col">
        <div className="border-b border-border bg-card px-4 py-5 sm:px-6">
          <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-6 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
          <div className="mb-4 h-10 w-full animate-pulse rounded-lg bg-slate-100" />
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0"
              >
                <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-200" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "profile") {
    return (
      <div className="flex min-h-full flex-col bg-background">
        <div className="border-b border-border bg-card px-4 py-3">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 animate-pulse rounded-full bg-slate-200" />
            <div className="space-y-2">
              <div className="h-7 w-56 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-8 w-20 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        </div>
        <div className="mx-auto grid w-full max-w-[1400px] flex-1 gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-3">
            <div className="h-40 animate-pulse rounded-xl border border-border bg-slate-100" />
            <div className="h-64 animate-pulse rounded-xl border border-border bg-slate-100" />
          </div>
          <div className="h-72 animate-pulse rounded-xl border border-border bg-slate-100" />
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="min-h-full border-b border-border bg-background px-4 py-6 sm:px-6">
        <div className="mb-6 h-7 w-40 animate-pulse rounded bg-slate-200" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-xl border border-border bg-slate-100"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="h-5 w-52 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="flex-1 px-4 py-5 sm:px-6">
        <div className="mb-4 flex gap-2">
          <div className="h-8 w-28 animate-pulse rounded-md bg-slate-100" />
          <div className="h-8 w-40 animate-pulse rounded-md bg-slate-100" />
          <div className="h-8 flex-1 animate-pulse rounded-md bg-slate-100" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="min-w-[220px] flex-1 space-y-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
