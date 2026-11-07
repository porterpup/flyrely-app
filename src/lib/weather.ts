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
  else if (w.source === 'current') parts.push('current conditions');
  return `${code}: ${parts.join(', ')}`;
}
