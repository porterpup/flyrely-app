import type { Flight } from '~/types';

const STORAGE_KEY = 'flyrely_flights';

export function getFlights(): Flight[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Flight[]) : [];
  } catch {
    return [];
  }
}

export function saveFlight(flight: Flight): void {
  const flights = getFlights();
  const existing = flights.findIndex((f) => f.id === flight.id);
  if (existing >= 0) {
    flights[existing] = flight;
  } else {
    flights.push(flight);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flights));
}

export function removeFlight(id: string): void {
  const flights = getFlights().filter((f) => f.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flights));
}

export function getFlightById(id: string): Flight | undefined {
  return getFlights().find((f) => f.id === id);
}

export function getUpcomingFlights(): Flight[] {
  const now = new Date();
  return getFlights()
    .filter((f) => new Date(f.scheduledDeparture) >= now)
    .sort(
      (a, b) =>
        new Date(a.scheduledDeparture).getTime() -
        new Date(b.scheduledDeparture).getTime()
    );
}
