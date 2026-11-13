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

/** Weather at an airport from /predict (origin_weather / destination_weather). Optional fields need API >= weather v2. */
export interface AirportWeather {
  temperature_f: number;
  wind_speed_mph: number;
  visibility_miles: number;
  conditions: string;
  /** 'current' = latest observation, 'forecast' = forecast for the flight's time */
  source?: 'current' | 'forecast' | null;
  /** UTC time of the observation / forecast */
  as_of?: string | null;
  ceiling_ft?: number | null;
  wx?: string | null;
}

/** What the traveller says happened. Sent to the API as `answer`. */
export type SelfReportAnswer = 'on_time' | 'late_15_44' | 'late_45_119' | 'late_120_plus' | 'cancelled' | 'did_not_fly';

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
  /** Weather at both airports from the last /predict; absent when weather was unavailable. */
  weather?: { origin: AirportWeather | null; destination: AirportWeather | null };
  /** Scheduled arrival, local time at the destination, `YYYY-MM-DDTHH:MM:SS` (no offset). Never named `scheduledArrival`: that legacy key is stripped on load. */
  scheduledArrivalLocal?: string;
  arrivalSource?: 'lookup' | 'manual';
  /** Trip this flight belongs to (a trip is 2-4 connecting flights), and its position (0-based). */
  tripId?: string;
  legIndex?: number;
  /** Minimum connect time in minutes needed before THIS leg (leg index > 0). */
  connectMctOverride?: number;
  /** The traveller's "Were you delayed?" answer. `answer: null` is a withdrawal that has not been sent yet. */
  selfReport?: { answer: SelfReportAnswer | null; answeredAt: string; sent: boolean };
  /** The home-screen prompt for this flight was dismissed. */
  reportPromptDismissed?: boolean;
}

/** A trip header. Legs live on the flights (tripId + legIndex). */
export interface Trip {
  id: string;
  name?: string;
  clientUpdatedAt: string;
}
