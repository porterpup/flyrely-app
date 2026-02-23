import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export function AppShell({ children, hideNav = false }: AppShellProps) {
  return (
    <div className="app-container">
      <div className="screen pb-20">
        {children}
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
}
