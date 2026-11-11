import { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { MessageSquare } from 'lucide-react';
import { AppShell } from '~/components/layout';
import { Alert, Button, Card, Input, ListGroup, ListRow, Modal, PageTitle, Select } from '~/components/ui';
import { useAuth } from '~/context/AuthContext';
import { openFeedback } from '~/lib/feedback';
import { PROFILE_AIRLINES, airportError, normalizeAirline, normalizeAirport } from '~/lib/profile';

export const Route = createFileRoute('/account/')({
  component: AccountScreen,
});

function AccountScreen() {
  const navigate = useNavigate();
  const { user, loading, signOut, syncStatus, updateProfile } = useAuth();
  const [confirmPending, setConfirmPending] = useState<number | null>(null);
  const email = user?.email ?? null;
  const initial = email ? email[0].toUpperCase() : '?';

  const [home, setHome] = useState(user?.profile.homeAirport ?? '');
  const [airline, setAirline] = useState(user?.profile.preferredAirline ?? '');
  const [homeErr, setHomeErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Pick up the saved profile if it arrives after first render.
  const savedHome = user?.profile.homeAirport ?? '';
  const savedAirline = user?.profile.preferredAirline ?? '';
  useEffect(() => {
    setHome(savedHome);
    setAirline(savedAirline);
  }, [savedHome, savedAirline]);

  const dirty = home.trim().toUpperCase() !== savedHome || airline !== savedAirline;

  async function handleSave() {
    setSaveMsg(null);
    const err = airportError(home);
    setHomeErr(err);
    if (err) return;
    setSaving(true);
    const { error } = await updateProfile({
      homeAirport: normalizeAirport(home),
      preferredAirline: normalizeAirline(airline),
    });
    setSaving(false);
    setSaveMsg(error ? { ok: false, text: "We couldn't save that. Please try again." } : { ok: true, text: 'Saved' });
  }

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
      <div className="px-6 pb-6 pt-10">
        <PageTitle title="Account" />

        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-card">
            <span className="text-title-lg text-white">{initial}</span>
          </div>
          <div className="min-w-0">
            {email ? (
              <p className="truncate text-title-sm text-ink">{email}</p>
            ) : (
              !loading && (
                <Link to="/auth/login" className="text-title-sm text-surface-accent">
                  Sign in
                </Link>
              )
            )}
            {user && (
              <p className="mt-0.5 text-body-sm text-ink-caption" role="status">
                {syncLine}
              </p>
            )}
          </div>
        </div>

        {user && (
          <div className="space-y-6">
            <section>
              <h2 className="mb-2 px-1 text-body-md font-medium text-ink-caption">Your flying</h2>
              <Card className="space-y-4">
                <Input
                  label="Home airport"
                  placeholder="e.g., JFK"
                  value={home}
                  maxLength={3}
                  autoCapitalize="characters"
                  autoComplete="off"
                  onChange={(e) => {
                    setHome(e.target.value.toUpperCase());
                    setHomeErr(null);
                    setSaveMsg(null);
                  }}
                  error={homeErr ?? undefined}
                  hint="We fill this in when you search a route."
                />
                <Select
                  label="Preferred airline"
                  value={airline}
                  placeholderSelected={!airline}
                  onChange={(e) => {
                    setAirline(e.target.value);
                    setSaveMsg(null);
                  }}
                  hint="Their flights are listed first in route results."
                >
                  <option value="">No preference</option>
                  {PROFILE_AIRLINES.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.name}
                    </option>
                  ))}
                </Select>
                {saveMsg && !saveMsg.ok && <Alert status="error" lineOne={saveMsg.text} />}
                <div className="flex items-center gap-3">
                  <Button size="sm" onClick={handleSave} loading={saving} disabled={!dirty}>
                    Save
                  </Button>
                  {saveMsg?.ok && !dirty && (
                    <span className="text-body-md text-status-success-text" role="status">
                      Saved
                    </span>
                  )}
                </div>
              </Card>
            </section>

            <ListGroup title="Support">
              <ListRow icon={<MessageSquare />} title="Send feedback" chevron onClick={openFeedback} />
            </ListGroup>

            <div className="flex justify-center pt-2">
              <button
                onClick={() => handleSignOut()}
                className="rounded px-3 py-2 text-body-md text-ink-caption underline underline-offset-4 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={confirmPending !== null} onClose={() => setConfirmPending(null)} title="Sign out anyway?" size="sm">
        <div className="space-y-4">
          <p className="text-ink-caption">
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
