import { describe, expect, it } from 'vitest'
import { shouldShowWeather, toAirportWeather, weatherCard, weatherFromPrediction, weatherLine, WEATHER_LATER_MESSAGE } from '../weather'

const base = { temperature_f: 47.6, wind_speed_mph: 13.8, visibility_miles: 10, conditions: 'clear' }

describe('weatherLine', () => {
  it('formats a forecast at departure', () => {
    const w = toAirportWeather({ ...base, source: 'forecast' })!
    expect(weatherLine('JFK', w, 'origin')).toBe('JFK: 48°F, wind 14 mph, forecast at departure')
    expect(weatherLine('LAX', w, 'destination')).toBe('LAX: 48°F, wind 14 mph, forecast around arrival')
  })
  it('handles current and legacy (no source) weather', () => {
    expect(weatherLine('JFK', toAirportWeather({ ...base, source: 'current' })!, 'origin')).toBe(
      'Now at JFK: 48°F, wind 14 mph'
    )
    expect(weatherLine('JFK', toAirportWeather(base)!, 'origin')).toBe('JFK: 48°F, wind 14 mph')
  })
})

describe('toAirportWeather / weatherFromPrediction', () => {
  it('rejects missing or malformed blocks', () => {
    expect(toAirportWeather(null)).toBeNull()
    expect(toAirportWeather({ temperature_f: 'hot' })).toBeNull()
    expect(toAirportWeather({ ...base, wind_speed_mph: undefined })).toBeNull()
  })
  it('is undefined when neither airport has weather', () => {
    expect(weatherFromPrediction({ origin_weather: null, destination_weather: null })).toBeUndefined()
    expect(weatherFromPrediction({})).toBeUndefined()
  })
  it('keeps one side when only one is available', () => {
    const got = weatherFromPrediction({ origin_weather: base, destination_weather: null })!
    expect(got.origin?.temperature_f).toBe(47.6)
    expect(got.destination).toBeNull()
  })
})

describe('weather card visibility', () => {
  const now = new Date('2026-11-07T12:00:00')
  const iso = (hoursAhead: number) => new Date(now.getTime() + hoursAhead * 3600_000).toISOString()
  const cur = toAirportWeather({ ...base, source: 'current' })!
  const fc = toAirportWeather({ ...base, source: 'forecast' })!
  const legacy = toAirportWeather(base)!
  const flight = (hours: number, w?: object) => ({
    origin: { code: 'JFK', name: '', city: '' }, destination: { code: 'LAX', name: '', city: '' },
    scheduledDeparture: iso(hours), weather: w as never,
  })

  it('shows a forecast at any distance', () => {
    expect(shouldShowWeather(fc, iso(300), now)).toBe(true)
  })
  it('shows current conditions only within about 6 hours', () => {
    expect(shouldShowWeather(cur, iso(5), now)).toBe(true)
    expect(shouldShowWeather(cur, iso(7), now)).toBe(false)
    expect(shouldShowWeather(cur, iso(24 * 13), now)).toBe(false)
  })
  it('hides legacy weather without a source and missing weather', () => {
    expect(shouldShowWeather(legacy, iso(1), now)).toBe(false)
    expect(shouldShowWeather(null, iso(1), now)).toBe(false)
  })
  it('far-future flight with current weather shows the "about a day before" note', () => {
    expect(weatherCard(flight(24 * 13, { origin: cur, destination: cur }), now))
      .toEqual({ kind: 'later', message: WEATHER_LATER_MESSAGE })
  })
  it('near flight with current weather is labelled "Now at JFK"', () => {
    const card = weatherCard(flight(3, { origin: cur, destination: null }), now)
    expect(card).toEqual({ kind: 'lines', lines: ['Now at JFK: 48°F, wind 14 mph'] })
  })
  it('forecast for a far flight shows lines', () => {
    expect(weatherCard(flight(30, { origin: fc, destination: fc }), now).kind).toBe('lines')
  })
  it('no weather and departure close shows nothing', () => {
    expect(weatherCard(flight(2, undefined), now)).toEqual({ kind: 'none' })
  })
})
