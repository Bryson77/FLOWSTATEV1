export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-150 pb-16">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 skeleton" />
          <div className="h-4 w-72 skeleton" />
        </div>
        <div className="h-9 w-32 skeleton rounded-full" />
      </div>

      {/* Hero card skeleton */}
      <div className="h-28 w-full skeleton rounded-2xl" />

      {/* Grid cards skeletons */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-44 w-full skeleton rounded-2xl" />
        <div className="h-44 w-full skeleton rounded-2xl" />
        <div className="h-44 w-full skeleton rounded-2xl" />
      </div>
    </div>
  );
}
