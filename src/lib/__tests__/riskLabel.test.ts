import { describe, expect, it } from 'vitest'
import { formatDelayChance, getRiskLabel, topReasons } from '../utils'

describe('risk labels', () => {
  it('uses plain labels, never "On track"', () => {
    expect(getRiskLabel('low')).toBe('Low risk')
    expect(getRiskLabel('medium')).toBe('Some risk')
    expect(getRiskLabel('high')).toBe('High risk')
  })
  it('words the percentage as a chance of a 15+ min delay', () => {
    expect(formatDelayChance(0.2)).toBe('20% chance of a 15+ min delay')
    expect(formatDelayChance(0.114)).toBe('11% chance of a 15+ min delay')
  })
  it('keeps the top two reasons', () => {
    expect(topReasons(['a', 'b', 'c'])).toBe('a • b')
    expect(topReasons([])).toBeUndefined()
    expect(topReasons(undefined)).toBeUndefined()
  })
})
