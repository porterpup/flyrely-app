import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '~/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  showCloseButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full bg-white rounded-t-3xl sm:rounded-2xl p-6',
          'animate-in slide-in-from-bottom sm:zoom-in-95 duration-200',
          sizeClasses[size]
        )}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between mb-4">
            {title && (
              <h2 className="text-xl font-semibold text-navy-900">{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-navy-400 hover:text-navy-600 rounded-lg hover:bg-navy-50"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
