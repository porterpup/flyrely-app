import { describe, expect, it } from 'vitest'
import { AIRPORT_REF, getCityLabel } from '../airportRef'
import { getAirport } from '../airports'

describe('AIRPORT_REF city coverage', () => {
  it('every airport has a non-empty city', () => {
    const missing = Object.entries(AIRPORT_REF)
      .filter(([, a]) => !a.city || !a.city.trim())
      .map(([code]) => code)
    expect(missing).toEqual([])
  })
})

describe('getCityLabel', () => {
  it('shows city and state for BHM', () => {
    expect(getCityLabel('BHM')).toBe('Birmingham, AL')
  })
})

describe('getAirport', () => {
  it('resolves codes missing from the short list via AIRPORT_REF', () => {
    expect(getAirport('BHM')).toEqual({
      code: 'BHM',
      name: 'Birmingham-Shuttlesworth International Airport',
      city: 'Birmingham',
    })
  })
  it('still returns the short-list entry when one exists', () => {
    expect(getAirport('jfk')?.city).toBe('New York')
  })
  it('returns undefined for unknown codes', () => {
    expect(getAirport('ZZZ')).toBeUndefined()
  })
})
