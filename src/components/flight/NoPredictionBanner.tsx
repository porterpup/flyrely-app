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
          'bg-amber-50 border border-amber-200 rounded-xl p-4',
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900">
              Prediction temporarily unavailable
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              {reason ||
                "We're having trouble generating a prediction right now. The airline's official status is shown below."}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-amber-800 hover:text-amber-900"
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
        'bg-navy-50 border border-navy-200 rounded-xl p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-navy-100 rounded-full flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-navy-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-navy-900">
            Delay prediction not available
          </h3>
          <p className="text-sm text-navy-600 mt-1">
            {reason ||
              "We don't have enough data to predict delays for this flight. You can still track the airline's official status."}
          </p>
        </div>
      </div>
    </div>
  );
}
