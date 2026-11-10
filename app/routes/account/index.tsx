import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { LogOut, MessageSquare } from 'lucide-react';
import { AppShell } from '~/components/layout';
import { Button, Modal } from '~/components/ui';
import { useAuth } from '~/context/AuthContext';
import { openFeedback } from '~/lib/feedback';

export const Route = createFileRoute('/account/')({
  component: AccountScreen,
});

function AccountScreen() {
  const navigate = useNavigate();
  const { user, loading, signOut, syncStatus } = useAuth();
  const [confirmPending, setConfirmPending] = useState<number | null>(null);
  const email = user?.email ?? null;
  const initial = email ? email[0].toUpperCase() : '?';

  async function handleSignOut(force = false) {
    const result = await signOut({ force });
    if (result.signedOut) {
      navigate({ to: '/auth/login' });
    } else {
      setConfirmPending(result.pending);
    }
  }

  const syncLine =
    syncStatus.state === 'offline'
      ? syncStatus.pending > 0
        ? `Offline: ${syncStatus.pending} ${syncStatus.pending === 1 ? 'change' : 'changes'} will upload when you reconnect`
        : 'Offline: changes will upload when you reconnect'
      : syncStatus.pending > 0
        ? `${syncStatus.pending} ${syncStatus.pending === 1 ? 'change' : 'changes'} waiting to upload`
        : 'Flights saved to your account';

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

        {user && <p className="mb-4 px-4 text-body-md text-ink-caption" role="status">{syncLine}</p>}

        {user && (
          <button
            onClick={openFeedback}
            className="w-full flex items-center gap-3 p-4 text-navy-800 hover:bg-navy-50 rounded-xl transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="font-medium">Send feedback</span>
          </button>
        )}

        {/* Sign Out */}
        {user && (
          <button
            onClick={() => handleSignOut()}
            className="w-full mt-8 flex items-center justify-center gap-2 p-4 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign out</span>
          </button>
        )}

      </div>

      <Modal isOpen={confirmPending !== null} onClose={() => setConfirmPending(null)} title="Sign out anyway?" size="sm">
        <div className="space-y-4">
          <p className="text-navy-600">
            {confirmPending} {confirmPending === 1 ? 'change hasn\'t' : 'changes haven\'t'} been saved to your account yet
            (you may be offline). Sign out anyway and lose {confirmPending === 1 ? 'it' : 'them'}?
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setConfirmPending(null)}>Cancel</Button>
            <Button variant="danger" fullWidth onClick={() => { setConfirmPending(null); void handleSignOut(true); }}>Sign out</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
