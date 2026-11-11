/** The one list of airlines offered in pickers (add flight, Account preferred airline). */
export interface AirlineInfo {
  code: string;
  name: string;
}

/** Spirit has stopped flying and Hawaiian now flies as Alaska, so neither is offered. */
export const AIRLINES: AirlineInfo[] = [
  { code: 'AA', name: 'American Airlines' },
  { code: 'AS', name: 'Alaska Airlines' },
  { code: 'B6', name: 'JetBlue Airways' },
  { code: 'DL', name: 'Delta Air Lines' },
  { code: 'F9', name: 'Frontier Airlines' },
  { code: 'G4', name: 'Allegiant Air' },
  { code: 'SY', name: 'Sun Country Airlines' },
  { code: 'UA', name: 'United Airlines' },
  { code: 'WN', name: 'Southwest Airlines' },
];

/** Names for old saved flights and typed codes; never shown in pickers. */
const LEGACY_AIRLINES: AirlineInfo[] = [
  { code: 'HA', name: 'Hawaiian Airlines' },
  { code: 'NK', name: 'Spirit Airlines' },
];

/** Look up any airline we know about by code, including ones no longer offered. */
export function findAirline(code: string): AirlineInfo | undefined {
  const c = code.toUpperCase();
  return AIRLINES.find((a) => a.code === c) ?? LEGACY_AIRLINES.find((a) => a.code === c);
}
