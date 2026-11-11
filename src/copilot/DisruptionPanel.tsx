import { useEffect, useMemo, useState } from 'react';
import type { Flight } from '~/types';
import { departureMs } from '~/lib/flightTime';
import { Button, Skeleton } from '~/components/ui';
import {
  CopilotError,
  DisruptionCard,
  DisruptionOptions,
  FlightCancelledLink,
  HomeAirportModal,
  HotelAddressField,
  PushToggle,
} from '~/components/copilot';
import { COPILOT_PUSH_ENABLED } from './flags';
import { getFlightState, getHomeAirport, setFlightState, setHomeAirport } from './prefs';
import type { UserFlightState } from './prefs';
import { rideUrlWithDropoff } from './rides';
import { CopilotApiError } from './api';
import { isNotFound, statusSourceOrNone, useCopilotConfig, useCopilotOptions, useCopilotStatus } from './useCopilot';
import type { CopilotState, OptionsResponse } from './types';

export interface DisruptionPanelProps {
  flight: Flight;
  onFlightChange: (flight: Flight) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const onDarkSecondary = '!border-white/40 !text-white hover:!bg-white/10';
const onDarkSolid = '!bg-white !text-ink hover:!bg-white/90';
const onDarkText = '!text-white hover:!bg-white/10';

/** Which card to show, from the user's own report first, then the flight's risk. null = hide the card. */
export function derivePanelState(
  userState: UserFlightState | null,
  riskLevel: Flight['riskLevel'],
  statusCancelled: boolean
): CopilotState | null {
  if (userState === 'cancelled') return 'cancelled';
  if (userState === 'rebooked_today' || userState === 'rebooked_later') return 'rebooked';
  if (userState === null && statusCancelled) return 'cancelled';
  if (riskLevel === 'high') return 'at_risk';
  return null;
}

/** 422 with detail.reason "unknown_airport": the API does not know one of the airports. */
function isUnknownAirport(error: unknown): boolean {
  if (!(error instanceof CopilotApiError) || error.status !== 422) return false;
  const detail = (error.body as { detail?: { reason?: unknown } } | null)?.detail;
  return detail?.reason === 'unknown_airport';
}

function OptionsSkeleton() {
  return (
    <div role="status" aria-label="Loading your options" className="space-y-3">
      <Skeleton onDark className="h-5 w-2/3 rounded" />
      <Skeleton onDark className="h-16 rounded-btn" />
      <Skeleton onDark className="h-16 rounded-btn" />
      <Skeleton onDark className="h-16 rounded-btn" />
    </div>
  );
}

/** The disruption copilot card on the flight details screen (plan S-P4). Renders nothing unless it has something to say. */
export function DisruptionPanel({ flight }: DisruptionPanelProps) {
  const [userState, setUserState] = useState<UserFlightState | null>(null);
  const [homeAirport, setHome] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [askRebooked, setAskRebooked] = useState(false);
  const [homeModalOpen, setHomeModalOpen] = useState(false);
  const [hotelAddress, setHotelAddress] = useState('');

  // Read device prefs after mount so the server and first client render match.
  useEffect(() => {
    setUserState(getFlightState(flight.id));
    setHome(getHomeAirport());
    setAskRebooked(false);
    setExpanded(false);
  }, [flight.id]);

  const config = useCopilotConfig();
  const apiOn = config.data?.enabled === true;

  const departsSoon = useMemo(() => {
    const ms = departureMs(flight) - Date.now();
    return Number.isFinite(ms) && ms <= DAY_MS;
  }, [flight.scheduledDeparture]);
  const status = useCopilotStatus(flight, apiOn && statusSourceOrNone(config.data?.status_source) !== 'none' && departsSoon);

  const panelState = derivePanelState(userState, flight.riskLevel, status.data?.status === 'cancelled');
  const rebooked = userState === 'rebooked_today' ? 'today' : userState === 'rebooked_later' ? 'later' : null;

  const options = useCopilotOptions({
    flight,
    state: panelState ?? 'at_risk',
    rebooked,
    homeAirport,
    enabled: apiOn && panelState !== null && (panelState !== 'at_risk' || expanded),
  });

  const changeUserState = (next: UserFlightState | null) => {
    setFlightState(flight.id, next); // false when storage is blocked: the choice still applies until reload
    setUserState(next);
    setAskRebooked(false);
    setHotelAddress('');
  };

  const saveHome = (code: string | null) => {
    setHomeAirport(code);
    setHome(code);
  };

  // Hidden: API flag off (404) or unreachable config, not enabled, or a normal flight.
  if (!config.data || !apiOn) return null;
  if (panelState === null) {
    // Quiet entry point on every other flight: opens the cancelled-flight flow.
    return <FlightCancelledLink onClick={() => changeUserState('cancelled')} />;
  }
  if (isNotFound(options.error)) return null;

  const withDropoff = (data: OptionsResponse): OptionsResponse =>
    hotelAddress.trim()
      ? {
          ...data,
          ride: {
            ...data.ride,
            links: data.ride.links.map((l) => ({ ...l, url: rideUrlWithDropoff(l, hotelAddress) })),
          },
        }
      : data;

  const risk = flight.riskLevel;
  const chancePercent =
    typeof flight.delayProbability === 'number' ? Math.round(flight.delayProbability * 100) : null;

  let body: React.ReactNode = null;
  if (panelState !== 'at_risk' || expanded) {
    if (options.isError) {
      const unsupported = isUnknownAirport(options.error);
      body = unsupported ? (
        <CopilotError
          title="We don't cover this route yet"
          description="The copilot doesn't cover this route yet. Contact your airline directly about rebooking and refunds."
        />
      ) : (
        <CopilotError onRetry={() => void options.refetch()} />
      );
    } else if (options.data) {
      const addressField =
        options.data.ride.links.some((l) => l.accepts_dropoff_address) ? (
          <HotelAddressField value={hotelAddress} onChange={setHotelAddress} />
        ) : null;
      body = (
        <DisruptionOptions
          options={withDropoff(options.data)}
          flight={{ origin: flight.origin.code, destination: flight.destination.code }}
          conditional={panelState === 'at_risk'}
          onChangeHomeAirport={() => setHomeModalOpen(true)}
          header={COPILOT_PUSH_ENABLED && panelState === 'at_risk' ? <PushToggle flight={flight} /> : undefined}
          stayExtra={addressField}
        />
      );
    } else {
      body = <OptionsSkeleton />;
    }
  }

  let actions: React.ReactNode = null;
  if (panelState === 'at_risk') {
    actions = (
      <Button size="sm" variant="secondary" className={onDarkSecondary} onClick={() => changeUserState('cancelled')}>
        My flight was cancelled
      </Button>
    );
  } else if (panelState === 'cancelled') {
    actions = askRebooked ? (
      <div role="group" aria-label="When were you rebooked for?" className="space-y-2">
        <p className="text-body-md text-white">When is your new flight?</p>
        <div className="flex gap-2">
          <Button size="sm" className={onDarkSolid} onClick={() => changeUserState('rebooked_today')}>
            Today
          </Button>
          <Button size="sm" className={onDarkSolid} onClick={() => changeUserState('rebooked_later')}>
            Tomorrow or later
          </Button>
          <Button size="sm" variant="text" className={onDarkText} onClick={() => setAskRebooked(false)}>
            Back
          </Button>
        </div>
      </div>
    ) : (
      <>
        <Button size="sm" className={onDarkSolid} onClick={() => setAskRebooked(true)}>
          I&apos;ve been rebooked
        </Button>
        <Button size="sm" variant="text" className={onDarkText} onClick={() => changeUserState('not_cancelled')}>
          Not cancelled after all
        </Button>
      </>
    );
  } else {
    actions = (
      <>
        {userState === 'rebooked_today' && (
          <a
            href="/flights/add"
            className="inline-flex items-center justify-center rounded-btn-sm bg-white px-3.5 py-3 text-action-md text-ink hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Add your new flight
          </a>
        )}
        <Button size="sm" variant="text" className={onDarkText} onClick={() => changeUserState('not_cancelled')}>
          Not cancelled after all
        </Button>
      </>
    );
  }

  return (
    <>
      <DisruptionCard
        state={panelState}
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
        risk={risk}
        chancePercent={chancePercent}
        actions={panelState === 'at_risk' && !expanded ? undefined : actions}
      >
        {body}
      </DisruptionCard>
      <HomeAirportModal
        isOpen={homeModalOpen}
        onClose={() => setHomeModalOpen(false)}
        current={homeAirport}
        onSave={saveHome}
      />
    </>
  );
}

// Sentinel: CI greps the flag-off build for this string to prove no copilot code shipped.
DisruptionPanel.displayName = '__flyrely_copilot__';
