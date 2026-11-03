import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Bell, CreditCard, LogOut, ChevronRight, Crown, Mail } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AppShell } from '~/components/layout';
import { useAuth } from '~/context/AuthContext';

export const Route = createFileRoute('/account/')({
  component: AccountScreen,
});

type MenuItem = {
  icon: LucideIcon;
  label: string;
  description?: string;
  to: string;
  badge?: string;
};

const menuSections: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Account',
    items: [
      {
        icon: Bell,
        label: 'Notification settings',
        description: 'Manage alerts and preferences',
        to: '/account/settings',
      },
      {
        icon: CreditCard,
        label: 'Plans & billing',
        description: 'Free plan',
        to: '/account/billing',
        badge: 'Upgrade',
      },
    ],
  },
];

function AccountScreen() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const email = user?.email ?? null;
  const initial = email ? email[0].toUpperCase() : '?';

  async function handleSignOut() {
    await signOut();
    navigate({ to: '/' });
  }

  return (
    <AppShell>
      <div className="px-4 pt-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-600">{initial}</span>
          </div>
          <div>
            {email ? (
              <h1 className="text-xl font-bold text-navy-900">{email}</h1>
            ) : (
              !loading && (
                <Link to="/auth/login" className="text-xl font-bold text-primary-600">
                  Sign in
                </Link>
              )
            )}
          </div>
        </div>

        {/* Upgrade Banner */}
        <div className="mb-6 p-4 bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">Upgrade to Premium</p>
                <p className="text-sm text-white/80">
                  Get unlimited flights & SMS alerts
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>

        {/* Menu Sections */}
        <div className="space-y-6">
          {menuSections.map((section) => (
            <div key={section.title}>
              <h2 className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-3">
                {section.title}
              </h2>
              <div className="bg-white border border-navy-200 rounded-xl divide-y divide-navy-100">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      className="flex items-center justify-between p-4 hover:bg-navy-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-navy-100 rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-navy-600" />
                        </div>
                        <div>
                          <p className="font-medium text-navy-900">{item.label}</p>
                          {item.description && (
                            <p className="text-sm text-navy-500">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <span className="px-2 py-0.5 bg-accent-100 text-accent-700 text-xs font-medium rounded-full">
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight className="w-5 h-5 text-navy-400" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Support */}
        <a
          href="mailto:support@flyrely.com"
          className="mt-6 flex items-center gap-3 p-4 bg-white border border-navy-200 rounded-xl hover:bg-navy-50 transition-colors"
        >
          <div className="w-10 h-10 bg-navy-100 rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-navy-600" />
          </div>
          <span className="font-medium text-navy-900">Contact support</span>
        </a>

        {/* Sign Out */}
        {user && (
          <button
            onClick={handleSignOut}
            className="w-full mt-8 flex items-center justify-center gap-2 p-4 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign out</span>
          </button>
        )}

        {/* Version */}
        <p className="text-center text-sm text-navy-400 mt-6 mb-4">
          Version 1.0.0
        </p>
      </div>
    </AppShell>
  );
}
