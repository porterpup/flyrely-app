import { ChevronLeft } from 'lucide-react';
import { cn } from '~/lib/utils';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBackClick?: () => void;
  rightAction?: React.ReactNode;
  subtitle?: string;
  transparent?: boolean;
}

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
        'sticky top-0 z-10 px-4 py-3',
        transparent ? 'bg-transparent' : 'bg-white border-b border-navy-100'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="w-12">
          {showBack && (
            <button
              onClick={onBackClick}
              className="p-2 -ml-2 text-navy-600 hover:text-navy-900 rounded-lg hover:bg-navy-50"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
        </div>

        <div className="flex-1 text-center">
          <h1 className="text-lg font-semibold text-navy-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-navy-500 mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="w-12 flex justify-end">{rightAction}</div>
      </div>
    </header>
  );
}
