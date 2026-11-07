import type { AirportWeather, Flight } from '~/types';

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Defensive copy of a /predict weather block: null unless the four core fields are numbers/strings. */
export function toAirportWeather(raw: unknown): AirportWeather | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const temperature_f = num(r.temperature_f);
  const wind_speed_mph = num(r.wind_speed_mph);
  const visibility_miles = num(r.visibility_miles);
  if (temperature_f === null || wind_speed_mph === null || visibility_miles === null) return null;
  return {
    temperature_f,
    wind_speed_mph,
    visibility_miles,
    conditions: typeof r.conditions === 'string' ? r.conditions : '',
    source: r.source === 'current' || r.source === 'forecast' ? r.source : null,
    as_of: typeof r.as_of === 'string' ? r.as_of : null,
    ceiling_ft: num(r.ceiling_ft),
    wx: typeof r.wx === 'string' ? r.wx : null,
  };
}

/** Weather to store on a flight from a /predict response; undefined when neither airport has any. */
export function weatherFromPrediction(p: {
  origin_weather?: unknown;
  destination_weather?: unknown;
}): Flight['weather'] {
  const origin = toAirportWeather(p.origin_weather);
  const destination = toAirportWeather(p.destination_weather);
  return origin || destination ? { origin, destination } : undefined;
}

/**
 * One line per airport, e.g. "JFK: 48°F, wind 14 mph, forecast at departure".
 * `role` picks the wording for forecasts: the origin forecast is for departure, the destination one for about arrival.
 */
export function weatherLine(code: string, w: AirportWeather, role: 'origin' | 'destination'): string {
  const parts = [`${Math.round(w.temperature_f)}°F`, `wind ${Math.round(w.wind_speed_mph)} mph`];
  if (w.source === 'forecast') parts.push(role === 'origin' ? 'forecast at departure' : 'forecast around arrival');
  return `${w.source === 'current' ? 'Now at ' : ''}${code}: ${parts.join(', ')}`;
}

/** Observed ("current") weather is only worth showing when the flight is this close. */
export const CURRENT_WEATHER_WINDOW_HOURS = 6;
export const WEATHER_LATER_MESSAGE = 'Weather forecast appears about a day before departure';

/**
 * Whether an airport's stored weather belongs on the flight page: always for a forecast for the flight time;
 * for current conditions only when departure is within ~6h (or already past). Anything else (a far-future
 * flight showing today's temperature, or legacy data with no source) is hidden.
 */
export function shouldShowWeather(w: AirportWeather | null | undefined, departureISO: string, now: Date = new Date()): boolean {
  if (!w) return false;
  if (w.source === 'forecast') return true;
  if (w.source === 'current') {
    const dep = new Date(departureISO).getTime();
    if (Number.isNaN(dep)) return false;
    return dep - now.getTime() <= CURRENT_WEATHER_WINDOW_HOURS * 3600_000;
  }
  return false;
}

export type WeatherCard =
  | { kind: 'lines'; lines: string[] }
  | { kind: 'later'; message: string }
  | { kind: 'none' };

/** What the Weather card shows: the visible airport lines, the "appears a day before" note, or nothing. */
export function weatherCard(flight: Pick<Flight, 'weather' | 'origin' | 'destination' | 'scheduledDeparture'>, now: Date = new Date()): WeatherCard {
  const lines: string[] = [];
  const { origin, destination } = flight.weather ?? {};
  if (shouldShowWeather(origin, flight.scheduledDeparture, now)) lines.push(weatherLine(flight.origin.code, origin!, 'origin'));
  if (shouldShowWeather(destination, flight.scheduledDeparture, now)) lines.push(weatherLine(flight.destination.code, destination!, 'destination'));
  if (lines.length) return { kind: 'lines', lines };
  const dep = new Date(flight.scheduledDeparture).getTime();
  if (!Number.isNaN(dep) && dep - now.getTime() > CURRENT_WEATHER_WINDOW_HOURS * 3600_000) {
    return { kind: 'later', message: WEATHER_LATER_MESSAGE };
  }
  return { kind: 'none' };
}
