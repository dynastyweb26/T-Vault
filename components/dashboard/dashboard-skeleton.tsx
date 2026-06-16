export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 px-5">
      <div className="tv-skeleton aspect-[4/5] rounded-2xl" />
      <div className="tv-skeleton h-48 rounded-2xl" />
      <div className="tv-skeleton h-52 rounded-2xl" />
      <div className="tv-skeleton h-32 rounded-2xl" />
    </div>
  );
}
