import { cn } from '~/lib/utils';

export function Divider({ dashed = false, className }: { dashed?: boolean; className?: string }) {
  return (
    <hr
      role="separator"
      className={cn(
        'w-full border-0 border-t border-white/20',
        dashed ? 'border-dashed' : 'border-solid',
        className
      )}
    />
  );
}
