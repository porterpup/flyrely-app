import { cn } from '~/lib/utils';

export interface NavigationTabProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  className?: string;
}

/** One bottom-nav tab (Figma "Navigation Tab"): icon, 12px label and an accent dot when active. */
export function NavigationTab({ icon, label, active = false, className }: NavigationTabProps) {
  return (
    <span
      className={cn(
        'relative flex flex-1 flex-col items-center gap-0.5 p-2',
        active ? 'text-surface-accent' : 'text-ink-caption',
        '[&_svg]:h-6 [&_svg]:w-6',
        className
      )}
    >
      {icon}
      <span className="text-body-sm">{label}</span>
      {active && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-surface-accent" />}
    </span>
  );
}
