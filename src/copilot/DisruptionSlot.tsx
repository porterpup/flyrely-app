import type { Flight } from '~/types';
import { COPILOT_ENABLED } from './flags';
import { DisruptionPanel } from './DisruptionPanel';

export interface DisruptionSlotProps {
  flight: Flight;
  onFlightChange: (flight: Flight) => void;
}

// Hook point on the flight details screen. Flag off: renders nothing, and the
// panel import is tree-shaken out of the build.
export function DisruptionSlot({ flight, onFlightChange }: DisruptionSlotProps) {
  if (!COPILOT_ENABLED) return null;
  return <DisruptionPanel flight={flight} onFlightChange={onFlightChange} />;
}
