import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export function AppShell({ children, hideNav = false }: AppShellProps) {
  return (
    <div className="app-container">
      <div className="screen pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
}
