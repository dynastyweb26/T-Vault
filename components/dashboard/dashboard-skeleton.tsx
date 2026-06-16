export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div
        className="tv-skeleton h-40 rounded-[var(--radius-card)]"
        style={{ borderLeft: "4px solid var(--color-border)" }}
      />
      <div className="grid grid-cols-3 gap-3">
        <div className="tv-skeleton h-24 rounded-[var(--radius-card)]" />
        <div className="tv-skeleton h-24 rounded-[var(--radius-card)]" />
        <div className="tv-skeleton h-24 rounded-[var(--radius-card)]" />
      </div>
      <div className="tv-skeleton h-16 rounded-[var(--radius-card)]" />
      <div className="tv-skeleton h-52 rounded-[var(--radius-card)]" />
      <div className="tv-skeleton h-32 rounded-[var(--radius-card)]" />
    </div>
  );
}
