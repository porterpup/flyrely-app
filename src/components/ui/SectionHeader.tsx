import { cn } from '~/lib/utils';

export interface SectionHeaderProps {
  title: string;
  /** Figma "Kind": default has 16px of space above, "no-space" has none. */
  kind?: 'default' | 'no-space';
  /** Optional trailing action (e.g. a small text Button or Link). */
  action?: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  /** Use on dark surfaces. */
  onDark?: boolean;
  className?: string;
}

export function SectionHeader({
  title,
  kind = 'default',
  action,
  as: Tag = 'h2',
  onDark = false,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between pb-1',
        kind === 'default' && 'pt-4',
        className
      )}
    >
      <Tag className={cn('text-title-md', onDark ? 'text-white' : 'text-ink')}>{title}</Tag>
      {action}
    </div>
  );
}
