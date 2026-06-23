import { describe, it, expect } from 'vitest'
import { formatLoginTime } from './formatLoginTime'

describe('formatLoginTime', () => {
  it('formats a timestamp into an en-GB day/month/year hour:minute string', () => {
    const timestamp = Date.UTC(2026, 5, 23, 9, 5)
    const result = formatLoginTime(timestamp)
    expect(result).toContain('23')
    expect(result).toContain('Jun')
    expect(result).toContain('2026')
    expect(result.toLowerCase()).toMatch(/am|pm/)
  })

  it('returns a string for the epoch', () => {
    expect(typeof formatLoginTime(0)).toBe('string')
  })
})
