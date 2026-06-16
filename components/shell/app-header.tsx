interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showDataProtection?: boolean;
}

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  return (
    <div className="px-5 pt-6">
      <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
