/** All airports supported by the FlyRely prediction API */
export interface AirportInfo {
  code: string;
  name: string;
  city: string;
  delayRate: number; // historical delay rate 0–1
  isHub: boolean;
}

export const AIRPORTS: AirportInfo[] = [
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International', city: 'Atlanta', delayRate: 0.21, isHub: true },
  { code: 'AUS', name: 'Austin-Bergstrom International', city: 'Austin', delayRate: 0.19, isHub: false },
  { code: 'BNA', name: 'Nashville International', city: 'Nashville', delayRate: 0.20, isHub: false },
  { code: 'BOS', name: 'Logan International', city: 'Boston', delayRate: 0.23, isHub: true },
  { code: 'BWI', name: 'Baltimore/Washington International', city: 'Baltimore', delayRate: 0.20, isHub: false },
  { code: 'CLT', name: 'Charlotte Douglas International', city: 'Charlotte', delayRate: 0.21, isHub: true },
  { code: 'DCA', name: 'Ronald Reagan Washington National', city: 'Washington D.C.', delayRate: 0.22, isHub: false },
  { code: 'DEN', name: 'Denver International', city: 'Denver', delayRate: 0.22, isHub: true },
  { code: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas', delayRate: 0.20, isHub: true },
  { code: 'DTW', name: 'Detroit Metropolitan Wayne County', city: 'Detroit', delayRate: 0.20, isHub: true },
  { code: 'EWR', name: 'Newark Liberty International', city: 'Newark', delayRate: 0.27, isHub: true },
  { code: 'FLL', name: 'Fort Lauderdale-Hollywood International', city: 'Fort Lauderdale', delayRate: 0.21, isHub: false },
  { code: 'IAH', name: 'George Bush Intercontinental', city: 'Houston', delayRate: 0.21, isHub: true },
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', delayRate: 0.26, isHub: true },
  { code: 'LAS', name: 'Harry Reid International', city: 'Las Vegas', delayRate: 0.19, isHub: true },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', delayRate: 0.19, isHub: true },
  { code: 'LGA', name: 'LaGuardia Airport', city: 'New York', delayRate: 0.26, isHub: true },
  { code: 'MCO', name: 'Orlando International', city: 'Orlando', delayRate: 0.20, isHub: true },
  { code: 'MDW', name: 'Chicago Midway International', city: 'Chicago', delayRate: 0.22, isHub: false },
  { code: 'MIA', name: 'Miami International', city: 'Miami', delayRate: 0.21, isHub: true },
  { code: 'MSP', name: 'Minneapolis-Saint Paul International', city: 'Minneapolis', delayRate: 0.21, isHub: true },
  { code: 'ORD', name: "O'Hare International", city: 'Chicago', delayRate: 0.25, isHub: true },
  { code: 'PDX', name: 'Portland International', city: 'Portland', delayRate: 0.19, isHub: false },
  { code: 'PHL', name: 'Philadelphia International', city: 'Philadelphia', delayRate: 0.24, isHub: true },
  { code: 'PHX', name: 'Phoenix Sky Harbor International', city: 'Phoenix', delayRate: 0.18, isHub: true },
  { code: 'SAN', name: 'San Diego International', city: 'San Diego', delayRate: 0.17, isHub: false },
  { code: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle', delayRate: 0.20, isHub: true },
  { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', delayRate: 0.24, isHub: true },
  { code: 'SLC', name: 'Salt Lake City International', city: 'Salt Lake City', delayRate: 0.18, isHub: false },
  { code: 'TPA', name: 'Tampa International', city: 'Tampa', delayRate: 0.19, isHub: false },
];

export interface AirlineInfo {
  code: string;
  name: string;
  delayRate: number;
}

export const AIRLINES: AirlineInfo[] = [
  { code: 'AA', name: 'American Airlines', delayRate: 0.21 },
  { code: 'AS', name: 'Alaska Airlines', delayRate: 0.17 },
  { code: 'B6', name: 'JetBlue Airways', delayRate: 0.24 },
  { code: 'DL', name: 'Delta Air Lines', delayRate: 0.18 },
  { code: 'F9', name: 'Frontier Airlines', delayRate: 0.27 },
  { code: 'G4', name: 'Allegiant Air', delayRate: 0.26 },
  { code: 'HA', name: 'Hawaiian Airlines', delayRate: 0.16 },
  { code: 'NK', name: 'Spirit Airlines', delayRate: 0.28 },
  { code: 'SY', name: 'Sun Country Airlines', delayRate: 0.25 },
  { code: 'UA', name: 'United Airlines', delayRate: 0.22 },
  { code: 'WN', name: 'Southwest Airlines', delayRate: 0.23 },
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
  return AIRLINES.find((a) => a.code === code.toUpperCase());
}

/** Popular well-known routes with on-time pct derived from delay rates */
export const POPULAR_ROUTES = [
  { from: 'JFK', to: 'LAX' },
  { from: 'SFO', to: 'JFK' },
  { from: 'ORD', to: 'ATL' },
  { from: 'LAX', to: 'ORD' },
  { from: 'DFW', to: 'LAX' },
  { from: 'ATL', to: 'MIA' },
  { from: 'BOS', to: 'DCA' },
  { from: 'SEA', to: 'SFO' },
  { from: 'DEN', to: 'PHX' },
  { from: 'EWR', to: 'ATL' },
];
