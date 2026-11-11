import { AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { cn } from '~/lib/utils';

interface NoPredictionBannerProps {
  type: 'temporary' | 'permanent';
  reason?: string;
  onRetry?: () => void;
  className?: string;
}

export function NoPredictionBanner({
  type,
  reason,
  onRetry,
  className,
}: NoPredictionBannerProps) {
  if (type === 'temporary') {
    return (
      <div
        className={cn(
          'bg-status-warning-bg border border-status-warning-text/20 rounded-tile p-4',
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-status-warning-bg rounded-full flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-status-warning-text" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-status-warning-text">
              Prediction temporarily unavailable
            </h3>
            <p className="text-body-md text-status-warning-text mt-1">
              {reason ||
                "We're having trouble generating a prediction right now. The airline's official status is shown below."}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 mt-2 text-body-md font-medium text-status-warning-text hover:text-status-warning-text"
              >
                <RefreshCw className="w-4 h-4" />
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-surface-muted border border-surface-stroke rounded-tile p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-surface-muted rounded-full flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-ink-caption" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-ink">
            Delay prediction not available
          </h3>
          <p className="text-body-md text-ink-caption mt-1">
            {reason ||
              "We don't have enough data to predict delays for this flight. You can still track the airline's official status."}
          </p>
        </div>
      </div>
    </div>
  );
}
