import { Fragment, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Button, Header, Input, Modal } from '~/components/ui';
import { ConnectionRow, FlightCard } from '~/components/flight';
import { useFlights } from '~/hooks/useFlights';
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
  const goBack = () => navigate({ to: '/trips' });

  if (!trip || legs.length === 0) {
    return (
      <div className="app-container">
        <div className="screen">
          <Header title="Trip" showBack onBackClick={goBack} />
          {ready ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center py-20">
              <h2 className="text-xl font-bold text-ink mb-2">Trip not found</h2>
              <p className="text-ink-caption mb-6">This trip may have been removed.</p>
              <Button onClick={goBack}>Back to trips</Button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="text-navy-400">Loading...</div>
            </div>
          )}
        </div>
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
    if (result !== 'updated') goBack();
  };

  const handleUngroup = () => {
    ungroupTrip(trip.id);
    setShowUngroup(false);
    goBack();
  };

  return (
    <div className="app-container">
      <div className="screen">
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
            <p className="text-navy-600">
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
      </div>
    </div>
  );
}
