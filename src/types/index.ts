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
  timezone: string;
}

export interface Airline {
  code: string;
  name: string;
  logo?: string;
}

export interface Flight {
  id: string;
  flightNumber: string;
  airline: Airline;
  origin: Airport;
  destination: Airport;
  scheduledDeparture: string; // ISO date
  scheduledArrival: string;
  predictedDeparture?: string;
  predictedArrival?: string;
  status: FlightStatus;
  riskLevel: RiskLevel;
  delayMinutes?: number;
  delayReason?: string;
  airlineStatus?: string;
  gate?: string;
  terminal?: string;
}

export interface Trip {
  id: string;
  name: string;
  flights: Flight[];
  createdAt: string;
}

export interface AlternateFlight {
  id: string;
  flightNumber: string;
  airline: Airline;
  scheduledDeparture: string;
  scheduledArrival: string;
  riskLevel: RiskLevel;
  availableSeats?: number;
  priceDifference?: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  notificationPreferences: NotificationPreferences;
}

export interface NotificationPreferences {
  push: boolean;
  email: boolean;
  sms: boolean;
  minSeverity: RiskLevel;
}

export interface Notification {
  id: string;
  flightId: string;
  type: 'risk_change' | 'delay_update' | 'gate_change' | 'status_change';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}
