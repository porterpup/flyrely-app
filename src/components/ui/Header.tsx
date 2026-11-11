import { ChevronLeft } from 'lucide-react';
import { cn } from '~/lib/utils';
import { IconButton } from './IconButton';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBackClick?: () => void;
  /** Sits at the right edge of the header (e.g. a refresh icon button). */
  rightAction?: React.ReactNode;
  subtitle?: string;
  transparent?: boolean;
}

/** Secondary navigation: back button, then the screen title (left-aligned), then an optional action at the right edge. */
export function Header({
  title,
  showBack = false,
  onBackClick,
  rightAction,
  subtitle,
  transparent = false,
}: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-10 flex min-h-[68px] items-center gap-3 px-6 pb-4 pt-[max(1rem,env(safe-area-inset-top))]',
        transparent ? 'bg-transparent' : 'bg-white'
      )}
    >
      {showBack && (
        <IconButton kind="text" size="sm" aria-label="Back" onClick={onBackClick} className="-ml-2">
          <ChevronLeft className="h-5 w-5" />
        </IconButton>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-title-sm font-medium text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-body-sm text-ink-caption">{subtitle}</p>}
      </div>
      {rightAction && <div className="-mr-2 flex shrink-0 items-center">{rightAction}</div>}
    </header>
  );
}
