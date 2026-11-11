import { AIRLINES, findAirline } from '~/lib/airlines';
import type { AirlineInfo } from '~/lib/airlines';

export type { AirlineInfo };
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

/** Lookup a single airport by exact code */
export function getAirport(code: string): AirportInfo | undefined {
  return AIRPORTS.find((a) => a.code === code.toUpperCase());
}

/** Lookup a single airline by exact code */
export function getAirline(code: string): AirlineInfo | undefined {
  return findAirline(code);
}
