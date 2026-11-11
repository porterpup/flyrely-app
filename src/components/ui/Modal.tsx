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
        className="absolute inset-0 bg-black/50 backdrop-blur-sm motion-safe:animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full bg-white rounded-t-3xl sm:rounded-tile p-6',
          'pb-[max(1.5rem,env(safe-area-inset-bottom))] motion-safe:animate-sheet-up sm:motion-safe:animate-pop-in',
          sizeClasses[size]
        )}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between mb-4">
            {title && (
              <h2 className="text-title-md font-semibold text-ink">{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-ink-caption opacity-70 hover:text-ink-caption rounded-lg hover:bg-surface-muted"
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
