import { Link, useRouterState } from '@tanstack/react-router';
import { Home, Plane, Compass, User } from 'lucide-react';
import { cn } from '~/lib/utils';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/trips', icon: Plane, label: 'Trips' },
  { to: '/explore', icon: Compass, label: 'Explore' },
  { to: '/account', icon: User, label: 'Account' },
] as const;

export function BottomNav() {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-navy-100 z-40">
      <div className="max-w-[430px] mx-auto flex items-center justify-around py-2 px-4">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[64px]',
                active
                  ? 'text-primary-600'
                  : 'text-navy-400 hover:text-navy-600'
              )}
            >
              <Icon className={cn('w-6 h-6', active && 'stroke-[2.5]')} />
              <span className={cn('text-xs', active ? 'font-semibold' : 'font-medium')}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
