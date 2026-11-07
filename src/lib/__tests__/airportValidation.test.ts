import { describe, expect, it } from 'vitest'
import { validateAirports } from '../airportRef'

describe('validateAirports', () => {
  it('accepts known, different airports (any case)', () => {
    expect(validateAirports('JFK', 'LAX')).toEqual({})
    expect(validateAirports('jfk', 'lax')).toEqual({})
  })
  it('rejects unknown airports with an inline message each', () => {
    const e = validateAirports('ZZZ', 'QQQ')
    expect(e.origin).toMatch(/ZZZ/)
    expect(e.dest).toMatch(/QQQ/)
    expect(validateAirports('JFK', 'LHR').dest).toMatch(/US airports only/)
  })
  it('rejects the same origin and destination', () => {
    expect(validateAirports('JFK', 'JFK')).toEqual({ dest: 'From and To must be different airports.' })
  })
  it('leaves empty fields to the required check', () => {
    expect(validateAirports('', '')).toEqual({})
  })
})
