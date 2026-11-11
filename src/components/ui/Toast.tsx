import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { cn } from '~/lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const toastConfig: Record<
  ToastType,
  { icon: React.ReactNode; bgColor: string; iconColor: string }
> = {
  success: {
    icon: <CheckCircle className="w-5 h-5" />,
    bgColor: 'bg-status-success-bg border-status-success-text/20',
    iconColor: 'text-status-success-text',
  },
  error: {
    icon: <AlertCircle className="w-5 h-5" />,
    bgColor: 'bg-status-error-bg border-status-error-text/20',
    iconColor: 'text-status-error-text',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    bgColor: 'bg-status-warning-bg border-status-warning-text/20',
    iconColor: 'text-status-warning-text',
  },
  info: {
    icon: <Info className="w-5 h-5" />,
    bgColor: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
  },
};

export function Toast({
  type = 'info',
  title,
  message,
  duration = 5000,
  onClose,
  action,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const config = toastConfig[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div
      className={cn(
        'fixed bottom-20 left-4 right-4 mx-auto max-w-sm z-50',
        'transform transition-all duration-300',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      )}
    >
      <div
        className={cn(
          'flex items-start gap-3 p-4 rounded-tile border shadow-lg',
          config.bgColor
        )}
      >
        <div className={cn('flex-shrink-0 mt-0.5', config.iconColor)}>
          {config.icon}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-ink">{title}</p>
          {message && (
            <p className="text-body-md text-ink-caption mt-0.5">{message}</p>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className="text-body-md font-medium text-primary-600 hover:text-primary-700 mt-2"
            >
              {action.label}
            </button>
          )}
        </div>

        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="flex-shrink-0 p-1 text-ink-caption opacity-70 hover:text-ink-caption rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Example usage with a toast manager hook
export function useToast() {
  const [toasts, setToasts] = useState<
    Array<{ id: string; props: Omit<ToastProps, 'onClose'> }>
  >([]);

  const show = (props: Omit<ToastProps, 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, props }]);
    return id;
  };

  const hide = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const success = (title: string, message?: string) =>
    show({ type: 'success', title, message });
  const error = (title: string, message?: string) =>
    show({ type: 'error', title, message });
  const warning = (title: string, message?: string) =>
    show({ type: 'warning', title, message });
  const info = (title: string, message?: string) =>
    show({ type: 'info', title, message });

  return {
    toasts,
    show,
    hide,
    success,
    error,
    warning,
    info,
  };
}
