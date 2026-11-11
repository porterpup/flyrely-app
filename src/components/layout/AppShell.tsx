import { BottomNav } from './BottomNav';
import { useOnline } from '~/hooks/useOnline';

interface AppShellProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export function AppShell({ children, hideNav = false }: AppShellProps) {
  const online = useOnline();
  return (
    <div className="app-container">
      {!online && (
        <div role="status" className="bg-status-warning-bg px-gutter py-2 text-center text-body-sm font-medium text-ink">
          You&apos;re offline
        </div>
      )}
      <main className="screen pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
