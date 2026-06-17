interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showDataProtection?: boolean;
}

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  return (
    <div className="px-5 pb-1 pt-7">
      <h2 className="tv-page-title">{title}</h2>
      {subtitle ? (
        <p className="tv-body mt-2 text-[var(--color-text-secondary)]">{subtitle}</p>
      ) : null}
    </div>
  );
}
