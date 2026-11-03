import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { AppShell } from '~/components/layout';
import { useAuth } from '~/context/AuthContext';

export const Route = createFileRoute('/account/')({
  component: AccountScreen,
});

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

      </div>
    </AppShell>
  );
}
