import { Link, useRouterState } from '@tanstack/react-router';
import { Home, Plane, Compass, User } from 'lucide-react';
import { cn } from '~/lib/utils';
import { NavigationTab } from '~/components/ui/NavigationTab';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/trips', icon: Plane, label: 'Trips' },
  { to: '/explore', icon: Compass, label: 'Explore' },
  { to: '/account', icon: User, label: 'Account' },
] as const;

/** Figma "Primary Navigation". `activePath` overrides the router (used by the gallery); `fixed={false}` renders inline. */
export function BottomNav({ activePath, fixed = true }: { activePath?: string; fixed?: boolean }) {
  const router = useRouterState();
  const currentPath = activePath ?? router.location.pathname;

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'z-40 border-t-[0.5px] border-surface-stroke bg-white shadow-elevation-1',
        fixed && 'fixed bottom-0 left-0 right-0'
      )}
    >
      <div className="mx-auto flex max-w-[430px] items-center justify-center gap-6 px-6 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              className="flex flex-1 rounded-lg transition duration-150 motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent"
            >
              <NavigationTab icon={<Icon />} label={label} active={active} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
