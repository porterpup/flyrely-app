import { describe, expect, it } from 'vitest'
import { toAirportWeather, weatherFromPrediction, weatherLine } from '../weather'

const base = { temperature_f: 47.6, wind_speed_mph: 13.8, visibility_miles: 10, conditions: 'clear' }

describe('weatherLine', () => {
  it('formats a forecast at departure', () => {
    const w = toAirportWeather({ ...base, source: 'forecast' })!
    expect(weatherLine('JFK', w, 'origin')).toBe('JFK: 48°F, wind 14 mph, forecast at departure')
    expect(weatherLine('LAX', w, 'destination')).toBe('LAX: 48°F, wind 14 mph, forecast around arrival')
  })
  it('handles current and legacy (no source) weather', () => {
    expect(weatherLine('JFK', toAirportWeather({ ...base, source: 'current' })!, 'origin')).toBe(
      'JFK: 48°F, wind 14 mph, current conditions'
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
