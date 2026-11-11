import { getAirportRef } from '~/lib/airportRef';

/** Airports and airlines for form autocomplete (names and codes only; no statistics). */
export interface AirportInfo {
  code: string;
  name: string;
  city: string;
}

export const AIRPORTS: AirportInfo[] = [
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International', city: 'Atlanta' },
  { code: 'AUS', name: 'Austin-Bergstrom International', city: 'Austin' },
  { code: 'BNA', name: 'Nashville International', city: 'Nashville' },
  { code: 'BOS', name: 'Logan International', city: 'Boston' },
  { code: 'BWI', name: 'Baltimore/Washington International', city: 'Baltimore' },
  { code: 'CLT', name: 'Charlotte Douglas International', city: 'Charlotte' },
  { code: 'DCA', name: 'Ronald Reagan Washington National', city: 'Washington D.C.' },
  { code: 'DEN', name: 'Denver International', city: 'Denver' },
  { code: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas' },
  { code: 'DTW', name: 'Detroit Metropolitan Wayne County', city: 'Detroit' },
  { code: 'EWR', name: 'Newark Liberty International', city: 'Newark' },
  { code: 'FLL', name: 'Fort Lauderdale-Hollywood International', city: 'Fort Lauderdale' },
  { code: 'IAH', name: 'George Bush Intercontinental', city: 'Houston' },
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York' },
  { code: 'LAS', name: 'Harry Reid International', city: 'Las Vegas' },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles' },
  { code: 'LGA', name: 'LaGuardia Airport', city: 'New York' },
  { code: 'MCO', name: 'Orlando International', city: 'Orlando' },
  { code: 'MDW', name: 'Chicago Midway International', city: 'Chicago' },
  { code: 'MIA', name: 'Miami International', city: 'Miami' },
  { code: 'MSP', name: 'Minneapolis-Saint Paul International', city: 'Minneapolis' },
  { code: 'ORD', name: "O'Hare International", city: 'Chicago' },
  { code: 'PDX', name: 'Portland International', city: 'Portland' },
  { code: 'PHL', name: 'Philadelphia International', city: 'Philadelphia' },
  { code: 'PHX', name: 'Phoenix Sky Harbor International', city: 'Phoenix' },
  { code: 'SAN', name: 'San Diego International', city: 'San Diego' },
  { code: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle' },
  { code: 'SFO', name: 'San Francisco International', city: 'San Francisco' },
  { code: 'SLC', name: 'Salt Lake City International', city: 'Salt Lake City' },
  { code: 'TPA', name: 'Tampa International', city: 'Tampa' },
];

export interface AirlineInfo {
  code: string;
  name: string;
}

export const AIRLINES: AirlineInfo[] = [
  { code: 'AA', name: 'American Airlines' },
  { code: 'AS', name: 'Alaska Airlines' },
  { code: 'B6', name: 'JetBlue Airways' },
  { code: 'DL', name: 'Delta Air Lines' },
  { code: 'F9', name: 'Frontier Airlines' },
  { code: 'G4', name: 'Allegiant Air' },
  { code: 'HA', name: 'Hawaiian Airlines' },
  { code: 'NK', name: 'Spirit Airlines' },
  { code: 'SY', name: 'Sun Country Airlines' },
  { code: 'UA', name: 'United Airlines' },
  { code: 'WN', name: 'Southwest Airlines' },
];

/** Search airports by code, name, or city (case-insensitive) */
export function searchAirports(query: string): AirportInfo[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return AIRPORTS.filter(
    (a) =>
      a.code.toLowerCase().startsWith(q) ||
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q)
  ).slice(0, 6);
}

/** Search airlines by code or name (case-insensitive) */
export function searchAirlines(query: string): AirlineInfo[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return AIRLINES.filter(
    (a) =>
      a.code.toLowerCase().startsWith(q) ||
      a.name.toLowerCase().includes(q)
  ).slice(0, 6);
}

/** Lookup a single airport by exact code; falls back to the full reference list (AIRPORT_REF). */
export function getAirport(code: string): AirportInfo | undefined {
  const c = code.toUpperCase();
  const short = AIRPORTS.find((a) => a.code === c);
  if (short) return short;
  const ref = getAirportRef(c);
  return ref ? { code: c, name: ref.name, city: ref.city ?? c } : undefined;
}

/** Lookup a single airline by exact code */
export function getAirline(code: string): AirlineInfo | undefined {
  return AIRLINES.find((a) => a.code === code.toUpperCase());
}
