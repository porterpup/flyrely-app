import { Fragment, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { SearchX } from 'lucide-react';
import { Button, EmptyState, Header, Input, Modal, Skeleton } from '~/components/ui';
import { ConnectionRow, FlightCard } from '~/components/flight';
import { useFlights } from '~/hooks/useFlights';
import { useGoBack } from '~/hooks/useGoBack';
import { removeLeg, renameTrip, ungroupTrip } from '~/lib/flightStore';
import { emitNotice } from '~/lib/syncEngine';
import { MAX_LEGS, legsOf, tripTitle } from '~/lib/tripGrouping';

export const Route = createFileRoute('/trips/$tripId')({
  component: TripScreen,
});

function TripScreen() {
  const navigate = useNavigate();
  const { tripId } = Route.useParams();
  const { flights, trips, ready } = useFlights();
  const [showUngroup, setShowUngroup] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');

  const trip = trips.find((t) => t.id === tripId);
  const legs = trip ? legsOf(trip, flights) : [];
  const goBack = useGoBack('/trips');
  const goToTrips = () => navigate({ to: '/trips' });

  if (!trip || legs.length === 0) {
    return (
      <div className="app-container">
        <main className="screen">
          <Header title="Trip" showBack onBackClick={goBack} />
          {ready ? (
            <EmptyState
              className="flex-1 justify-center"
              icon={<SearchX />}
              title="Trip not found"
              description="This trip may have been removed."
              action={<Button onClick={goToTrips}>Back to trips</Button>}
            />
          ) : (
            <div className="flex-1 space-y-3 px-6 py-4" role="status" aria-label="Loading trip">
              <Skeleton className="h-24 w-full rounded-tile" />
              <Skeleton className="h-24 w-full rounded-tile" />
            </div>
          )}
        </main>
      </div>
    );
  }

  const last = legs[legs.length - 1];

  const handleRename = () => {
    if (!renameTrip(trip.id, name)) {
      setNameError('Use 80 characters or fewer.');
      return;
    }
    setShowRename(false);
  };

  const handleRemoveLeg = (flightId: string) => {
    const result = removeLeg(trip.id, flightId);
    if (result === 'ungrouped_not_connected') emitNotice('Trip ungrouped because the flights no longer connect.');
    if (result !== 'updated') goToTrips();
  };

  const handleUngroup = () => {
    ungroupTrip(trip.id);
    setShowUngroup(false);
    goToTrips();
  };

  return (
    <div className="app-container">
      <main className="screen">
        <Header title={tripTitle(trip, legs)} showBack onBackClick={goBack} />

        <div className="flex-1 px-4 py-4 space-y-3 pb-24">
          {legs.map((leg, i) => (
            <Fragment key={leg.id}>
              {i > 0 && <ConnectionRow prev={legs[i - 1]} next={leg} />}
              <FlightCard
                flight={leg}
                variant="compact"
                onClick={() => navigate({ to: '/flights/$flightId', params: { flightId: leg.id } })}
              />
              <button
                type="button"
                onClick={() => handleRemoveLeg(leg.id)}
                className="w-full text-center text-body-md text-ink-caption underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent"
              >
                Remove {leg.flightNumber} from trip
              </button>
            </Fragment>
          ))}

          <div className="space-y-3 pt-4">
            {legs.length < MAX_LEGS && (
              <Button
                fullWidth
                onClick={() => navigate({ to: '/flights/add', search: { after: last.id } })}
              >
                Add connecting flight
              </Button>
            )}
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setName(trip.name ?? '');
                setNameError('');
                setShowRename(true);
              }}
            >
              Rename
            </Button>
            <Button variant="secondary" fullWidth onClick={() => setShowUngroup(true)}>
              Ungroup trip
            </Button>
          </div>
        </div>

        <Modal isOpen={showUngroup} onClose={() => setShowUngroup(false)} title="Ungroup this trip?" size="sm">
          <div className="space-y-4">
            <p className="text-ink-caption">
              The flights stay on your list as separate flights. Nothing is deleted.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setShowUngroup(false)}>Cancel</Button>
              <Button variant="danger" fullWidth onClick={handleUngroup}>Ungroup</Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={showRename} onClose={() => setShowRename(false)} title="Rename trip" size="sm">
          <div className="space-y-4">
            <Input
              label="Trip name"
              value={name}
              maxLength={80}
              error={nameError || undefined}
              hint="Leave empty to use the route as the name."
              onChange={(e) => setName(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setShowRename(false)}>Cancel</Button>
              <Button fullWidth onClick={handleRename}>Save</Button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
}
