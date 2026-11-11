import { AlertCircle, WifiOff, Search, RefreshCw, ServerCrash } from 'lucide-react';
import { Button } from './Button';
import { cn } from '~/lib/utils';

type ErrorType =
  | 'network'
  | 'not_found'
  | 'server'
  | 'search_no_results'
  | 'generic';

interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
  compact?: boolean;
}

const errorConfigs: Record<
  ErrorType,
  { icon: React.ReactNode; title: string; message: string }
> = {
  network: {
    icon: <WifiOff className="w-8 h-8 text-ink-caption opacity-70" />,
    title: 'No internet connection',
    message: "Please check your connection and try again.",
  },
  not_found: {
    icon: <Search className="w-8 h-8 text-ink-caption opacity-70" />,
    title: 'Flight not found',
    message:
      "We couldn't find a flight matching your search. Please check the details and try again.",
  },
  server: {
    icon: <ServerCrash className="w-8 h-8 text-ink-caption opacity-70" />,
    title: 'Something went wrong',
    message: "We're having trouble connecting to our servers. Please try again later.",
  },
  search_no_results: {
    icon: <Search className="w-8 h-8 text-ink-caption opacity-70" />,
    title: 'No flights found',
    message: "We couldn't find any flights matching your search. Try different dates or airports.",
  },
  generic: {
    icon: <AlertCircle className="w-8 h-8 text-ink-caption opacity-70" />,
    title: 'Something went wrong',
    message: "An unexpected error occurred. Please try again.",
  },
};

export function ErrorState({
  type = 'generic',
  title,
  message,
  onRetry,
  onAction,
  actionLabel,
  className,
  compact = false,
}: ErrorStateProps) {
  const config = errorConfigs[type];

  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        compact ? 'py-6 px-4' : 'py-12 px-6',
        className
      )}
    >
      <div
        className={cn(
          'bg-surface-muted rounded-full flex items-center justify-center mb-4',
          compact ? 'w-14 h-14' : 'w-20 h-20'
        )}
      >
        {config.icon}
      </div>

      <h3
        className={cn(
          'font-semibold text-ink mb-2',
          compact ? 'text-body-lg' : 'text-title-md'
        )}
      >
        {title || config.title}
      </h3>

      <p
        className={cn(
          'text-ink-caption mb-6 max-w-sm',
          compact ? 'text-body-md' : 'text-body-lg'
        )}
      >
        {message || config.message}
      </p>

      <div className="flex gap-3">
        {onRetry && (
          <Button
            variant="secondary"
            size={compact ? 'sm' : 'default'}
            onClick={onRetry}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Try again
          </Button>
        )}

        {onAction && actionLabel && (
          <Button size={compact ? 'sm' : 'default'} onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
