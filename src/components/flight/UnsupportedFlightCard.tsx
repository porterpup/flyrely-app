import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '~/components/ui';
import { formatDate, formatTime } from '~/lib/utils';

type UnsupportedReason =
  | 'airline_not_supported'
  | 'route_not_supported'
  | 'no_prediction_data'
  | 'flight_not_found';

interface UnsupportedFlightCardProps {
  flightNumber: string;
  origin: string;
  destination: string;
  departureDate: string;
  reason: UnsupportedReason;
  onRetry?: () => void;
  onTrackStatusOnly?: () => void;
  onFindAlternative?: () => void;
}

const reasonMessages: Record<
  UnsupportedReason,
  { title: string; description: string }
> = {
  airline_not_supported: {
    title: 'Airline not yet supported',
    description:
      "We're working on adding support for this airline. For now, you can track the official status only.",
  },
  route_not_supported: {
    title: 'Route not yet supported',
    description:
      "We don't have enough historical data to predict delays on this route yet.",
  },
  no_prediction_data: {
    title: 'No prediction available',
    description:
      "We couldn't generate a delay prediction for this flight right now. This may be temporary.",
  },
  flight_not_found: {
    title: 'Flight not found',
    description:
      "We couldn't find this flight. Please check the flight number and date.",
  },
};

export function UnsupportedFlightCard({
  flightNumber,
  origin,
  destination,
  departureDate,
  reason,
  onRetry,
  onTrackStatusOnly,
  onFindAlternative,
}: UnsupportedFlightCardProps) {
  const { title, description } = reasonMessages[reason];

  return (
    <div className="bg-white border border-navy-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-navy-50 px-4 py-3 border-b border-navy-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">✈️</span>
            <span className="font-semibold text-navy-900">{flightNumber}</span>
          </div>
          <span className="text-sm text-navy-500">
            {formatDate(departureDate)}
          </span>
        </div>
        <p className="text-sm text-navy-600 mt-1">
          {origin} → {destination}
        </p>
      </div>

      {/* Warning */}
      <div className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-navy-900">{title}</h3>
            <p className="text-sm text-navy-600 mt-1">{description}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {reason === 'no_prediction_data' && onRetry && (
            <Button
              variant="outline"
              fullWidth
              onClick={onRetry}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Try Again
            </Button>
          )}

          {(reason === 'airline_not_supported' || reason === 'route_not_supported') &&
            onTrackStatusOnly && (
              <Button variant="outline" fullWidth onClick={onTrackStatusOnly}>
                Track Official Status Only
              </Button>
            )}

          {reason === 'flight_not_found' && onFindAlternative && (
            <Button variant="outline" fullWidth onClick={onFindAlternative}>
              Search for Different Flight
            </Button>
          )}

          {/* Airline link */}
          <button className="w-full flex items-center justify-center gap-2 py-2 text-sm text-primary-600 hover:text-primary-700">
            <span>Check airline website</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
