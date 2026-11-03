// FlyRely Type Definitions

export type RiskLevel = 'low' | 'medium' | 'high';

export type FlightStatus =
  | 'scheduled'
  | 'on_time'
  | 'delayed'
  | 'cancelled'
  | 'boarding'
  | 'departed'
  | 'landed'
  | 'completed';

export interface Airport {
  code: string;
  name: string;
  city: string;
  timezone?: string;
}

export interface Airline {
  code: string;
  name: string;
  logo?: string;
}

export interface DelaySeverity {
  minor_pct: number;
  moderate_pct: number;
  severe_pct: number;
  expected_delay_label: string;
  expected_delay_range: string;
}

export interface Flight {
  id: string;
  flightNumber: string;
  airline: Airline;
  origin: Airport;
  destination: Airport;
  scheduledDeparture: string; // ISO date
  status: FlightStatus;
  riskLevel: RiskLevel;
  /** Model probability of a 15+ minute delay (0-1), straight from /predict. */
  delayProbability?: number;
  delayReason?: string;
  gate?: string;
  terminal?: string;
  delaySeverity?: DelaySeverity | null;
  lastCheckedAt?: number;
  /** Data-coverage caveats from /predict, e.g. airport not in historical data. */
  warnings?: string[];
}
