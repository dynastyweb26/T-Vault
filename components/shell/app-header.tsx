interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showDataProtection?: boolean;
}

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  return (
    <div className="px-5 pt-6">
      <h2 className="tv-page-title">{title}</h2>
      {subtitle ? (
        <p className="tv-body mt-1 text-[var(--color-text-secondary)]">{subtitle}</p>
      ) : null}
    </div>
  );
}
