import { AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react';
import { cn } from '~/lib/utils';

type AlertType = 'risk_increase' | 'risk_decrease' | 'gate_change' | 'status_update';

interface AlertCardProps {
  type: AlertType;
  flightNumber: string;
  message: string;
  timestamp: string;
  onClick?: () => void;
}

const alertConfig: Record<AlertType, { icon: React.ReactNode; color: string }> = {
  risk_increase: {
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'bg-amber-100 text-amber-600',
  },
  risk_decrease: {
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'bg-green-100 text-green-600',
  },
  gate_change: {
    icon: <Info className="w-5 h-5" />,
    color: 'bg-blue-100 text-blue-600',
  },
  status_update: {
    icon: <Clock className="w-5 h-5" />,
    color: 'bg-navy-100 text-navy-600',
  },
};

export function AlertCard({
  type,
  flightNumber,
  message,
  timestamp,
  onClick,
}: AlertCardProps) {
  const config = alertConfig[type];

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-navy-200 rounded-xl p-4 hover:border-navy-300 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', config.color)}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-navy-900 truncate">{message}</p>
            <span className="text-xs text-navy-400 whitespace-nowrap">{timestamp}</span>
          </div>
          <p className="text-sm text-navy-500 mt-0.5">{flightNumber}</p>
        </div>
      </div>
    </button>
  );
}
