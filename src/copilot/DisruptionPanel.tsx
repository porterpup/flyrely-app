import type { Flight } from '~/types';

export interface DisruptionPanelProps {
  flight: Flight;
  onFlightChange: (flight: Flight) => void;
}

// Placeholder for S-P4. Renders nothing for now.
export function DisruptionPanel(_props: DisruptionPanelProps) {
  return null;
}

// Sentinel: CI greps the flag-off build for this string to prove no copilot code shipped.
DisruptionPanel.displayName = '__flyrely_copilot__';
