import { cn } from '~/lib/utils';

export function Divider({
  tone = 'light',
  dashed = false,
  className,
}: {
  tone?: 'light' | 'dark';
  dashed?: boolean;
  className?: string;
}) {
  return (
    <hr
      role="separator"
      className={cn(
        'w-full border-0 border-t',
        dashed ? 'border-dashed' : 'border-solid',
        tone === 'light' ? 'border-surface-divider' : 'border-white/20',
        className
      )}
    />
  );
}
